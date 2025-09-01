        // Set up initial variables
        const STORAGE_KEY = 'task_cards_data';
        
        // Speech recognition variables
        let isListening = false;
        let recognitionInstance = null;
        
        // Function to test microphone access
        async function testMicrophone() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                console.log('Microphone test successful');
                
                // Check if we have audio tracks
                const audioTracks = stream.getAudioTracks();
                if (audioTracks.length === 0) {
                    throw new Error('No audio tracks found');
                }
                
                console.log(`Found ${audioTracks.length} audio track(s):`, audioTracks.map(track => ({
                    label: track.label,
                    enabled: track.enabled,
                    muted: track.muted,
                    readyState: track.readyState
                })));
                
                // Clean up
                stream.getTracks().forEach(track => track.stop());
                return true;
            } catch (error) {
                console.error('Microphone test failed:', error);
                return false;
            }
        }
        
        // Debug function to check microphone status (call from console)
        window.debugMicrophone = async function() {
            console.log('=== MICROPHONE DEBUG INFO ===');
            console.log('Protocol:', location.protocol);
            console.log('Hostname:', location.hostname);
            console.log('Speech Recognition Support:', {
                'SpeechRecognition': 'SpeechRecognition' in window,
                'webkitSpeechRecognition': 'webkitSpeechRecognition' in window
            });
            
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                console.log('getUserMedia supported');
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const audioInputs = devices.filter(device => device.kind === 'audioinput');
                    console.log('Audio input devices:', audioInputs.map(device => ({
                        deviceId: device.deviceId,
                        label: device.label || 'Unknown device',
                        groupId: device.groupId
                    })));
                    
                    const micTest = await testMicrophone();
                    console.log('Microphone test result:', micTest ? 'PASSED' : 'FAILED');
                } catch (error) {
                    console.error('Error checking devices:', error);
                }
            } else {
                console.log('getUserMedia NOT supported');
            }
            console.log('=== END DEBUG INFO ===');
        };
        
        const cardColors = [
            // A - Amber (darker for light mode)
            '#F57C00',
            // B - Blue (darker)
            '#1565C0', 
            // C - Coral (darker)
            '#D84315',
            // D - Deep Purple (darker)
            '#4527A0',
            // E - Emerald (darker)
            '#2E7D32',
            // F - Fuchsia (darker)
            '#C2185B',
            // G - Gold (darker)
            '#F9A825',
            // H - Hot Pink (darker)
            '#E91E63',
            // I - Indigo (darker)
            '#283593',
            // J - Jade (darker)
            '#00838F',
            // K - Khaki (darker)
            '#689F38',
            // L - Lavender (darker)
            '#7B1FA2',
            // M - Magenta (darker)
            '#AD1457',
            // N - Navy (darker)
            '#0D47A1',
            // O - Orange (darker)
            '#EF6C00',
            // P - Purple (darker)
            '#6A1B9A',
            // Q - Quartz (darker)
            '#5D4037',
            // R - Red (darker)
            '#C62828',
            // S - Silver (darker)
            '#455A64',
            // T - Teal (darker)
            '#00695C',
            // U - Ultramarine (darker)
            '#1A237E',
            // V - Violet (darker)
            '#4A148C',
            // W - Wine (darker)
            '#880E4F',
            // X - Xanthe (darker yellow)
            '#F9A825',
            // Y - Yellow (darker)
            '#F57C00',
            // Z - Zaffre (darker blue)
            '#01579B'
        ];
        const categories = ['Task', 'Work', 'Travel', 'Meeting', 'Reminder', 'Idea', 'Goal', 'Note'];

        // Default gray color
        const defaultColor = '#333333';
        const defaultShadow = '0 2px 10px rgba(0, 0, 0, 0.5)';
        
        // Utility function to determine if text should be dark or light based on background
        function getTextColorForBackground(backgroundColor) {
            // For gradients, default to white text
            if (backgroundColor.includes('gradient')) {
                return 'white';
            }
            
            // For hex colors, calculate brightness
            let color = backgroundColor.trim();
            
            // Convert shorthand hex (#fff) to full hex (#ffffff)
            if (color.startsWith('#') && color.length === 4) {
                color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
            }
            
            // Extract RGB values
            let r, g, b;
            if (color.startsWith('#')) {
                r = parseInt(color.substr(1, 2), 16);
                g = parseInt(color.substr(3, 2), 16);
                b = parseInt(color.substr(5, 2), 16);
            } else {
                return 'white'; // Default for unknown formats
            }
            
            // Calculate perceived brightness using the formula: (0.299*R + 0.587*G + 0.114*B)
            const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            
            // Use white text for dark backgrounds, black text for light backgrounds
            return brightness > 0.5 ? 'black' : 'white';
        }
        
        let currentColorIndex = 0;
        let typingTimer; // Timer to track typing pauses
        const typingTimeout = 1500; // Reset to gray after 1.5 seconds of no typing
        let cardCount = 0; // Track number of cards
        const maxVisibleCards = window.maxVisibleCards || 100; // Maximum number of cards visible in stack
        let isOrganizeMode = false; // Track if we're in organized view mode
        
        const pillBar = document.querySelector('.pill-bar');
        const taskInput = document.querySelector('.task-input');

        const settingsButton = document.querySelector('.settings-button');
        const cardsStack = document.querySelector('.cards-stack');
        
        // Category patterns for intelligent labeling
        const categoryPatterns = {
            'Task': [
                /\btodo\b/i, 
                /\btask(s)?\b/i,
                /\bcomplete\b/i, 
                /\bfinish(ed)?\b/i,
                /\bdo\b/i, 
                /need(s)? to\b/i,
                /\bhave\s+to\b/i,
                /\bgotta\b/i,
                /\bmust\b/i,
                /\bshould\b/i,
                /\bissue\b/i,
                /\bfix\b/i,
                /\bsolve\b/i,
                /\bhandle\b/i,
                /\baction\s+item(s)?\b/i,
                /\bassignment\b/i,
                /\bduty\b/i,
                /\bresponsibility\b/i,
                /\bpriority\b/i,
                /\bpending\b/i,
                /\b(can|could) you\b/i,
                /\blet's\b.*?\b(do|make|create|build|implement)\b/i,
                /\bdon't forget to\b/i,
                /^(please\s+)?(make|create|build|implement|do)/i,
                /\b(add|remove|change|update|modify)\b/i
            ],
            'Work': [
                /\bwork\b/i,
                /\bjob\b/i, 
                /\bproject\b/i, 
                /\bclient\b/i, 
                /\bdeadline\b/i, 
                /\bdeliverable(s)?\b/i, 
                /\breport(s)?\b/i, 
                /\bpresentation(s)?\b/i,
                /\bwork on\b/i,
                /\bcode\b/i,
                /\bprogram\b/i,
                /\bdevelop(ment)?\b/i,
                /\breview\b/i,
                /\bdocument(ation)?\b/i,
                /\bemail\b/i,
                /\bcall with\b/i,
                /\bemployee\b/i,
                /\bmanager\b/i,
                /\bcoworker\b/i,
                /\bcolleague\b/i,
                /\bboss\b/i,
                /\bhiring\b/i,
                /\binterview\b/i,
                /\bresume\b/i,
                /\bcv\b/i,
                /\bq[1-4]\b/i,
                /\bquarter\b/i,
                /\bfiscal\b/i,
                /\bbudget\b/i,
                /\bexpense(s)?\b/i,
                /\binvoice\b/i,
                /\bpayment\b/i,
                /\bsalary\b/i,
                /\b(weekly|monthly|quarterly|annual) report\b/i,
                /\boffice\b/i,
                /\bdepartment\b/i,
                /\bhr\b/i,
                /\bit\b/i
            ],
            'Travel': [
                /\btravel\b/i, 
                /\btrip\b/i, 
                /\bvacation\b/i,
                /\bholiday\b/i,
                /\bvisit\b/i, 
                /\btour\b/i,
                /\bflight\b/i,
                /\bplane\b/i,
                /\btrain\b/i,
                /\bbus\b/i, 
                /\bhotel\b/i,
                /\blodging\b/i,
                /\baccommodation\b/i,
                /\bairbnb\b/i,
                /\bpacking\b/i,
                /\bsuitcase\b/i,
                /\bluggage\b/i, 
                /\bdrive\b/i,
                /\broad trip\b/i,
                /\bitinerary\b/i,
                /\breservation\b/i,
                /\bbook(ing)?\b.*?\b(ticket|flight|hotel|reservation|accommodation)\b/i,
                /\brent\s+a\s+car\b/i,
                /\bcar\s+rental\b/i,
                /\bpassport\b/i,
                /\bvisa\b/i,
                /\binternational\b/i,
                /\bcurrency\b/i,
                /\bexchange\s+rate\b/i,
                /\btraveler'?s\s+check\b/i,
                /\btourism\b/i,
                /\bsightseeing\b/i,
                /\btour guide\b/i,
                /\bcruise\b/i,
                /\bresort\b/i,
                /\bdestination\b/i,
                /\bterminal\b/i,
                /\bgate\b/i,
                /\bboard(ing)?\b/i,
                /\bairport\b/i,
                /\btake off\b/i,
                /\bland(ing)?\b/i,
                /going\s+to\s+([A-Z][a-z]+)/
            ],
            'Meeting': [
                /\bmeeting\b/i, 
                /\bcall\b/i, 
                /\bconference\b/i,
                /\bconversation\b/i,
                /\bdiscuss(ion)?\b/i, 
                /\bsession\b/i,
                /\binterview\b/i, 
                /\bappointment\b/i,
                /\bconsultation\b/i,
                /\bzoom\b/i,
                /\bmicrosoft teams\b/i,
                /\bms teams\b/i,
                /\bteams\b/i,
                /\bwebex\b/i,
                /\bgoogle meet\b/i,
                /\bgoogle hangouts\b/i,
                /\bhangouts\b/i,
                /\bmeet with\b/i,
                /\bmeet up\b/i,
                /\bretro(spective)?\b/i,
                /\b1:1\b/i,
                /\b1-1\b/i,
                /\bone-on-one\b/i,
                /\b1-on-1\b/i,
                /\bsync\b/i,
                /\bstand(up|down)\b/i,
                /\btownhall\b/i,
                /\ball-hands\b/i,
                /\bresync\b/i,
                /\bchat with\b/i,
                /\bscrum\b/i,
                /\bsprint\b/i,
                /\bplan(ning)?\b/i,
                /\bdemo\b/i,
                /\bagenda\b/i,
                /\bbriefing\b/i,
                /\bbrain(storming|storm)\b/i,
                /\bcheck-in\b/i,
                /\bkickoff\b/i,
                /\bworkshop\b/i,
                /\bseminar\b/i,
                /\bgathering\b/i,
                /\bassembly\b/i,
                /\b(video|audio)\s+call\b/i,
                /meet\s+with\s+([A-Z][a-z]+)/,
                /talk\s+to\s+([A-Z][a-z]+)/,
                /\bat\s+\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)?/
            ],
            'Reminder': [
                /\bremember\b/i, 
                /\bremind(er)?\b/i, 
                /\bdon'?t\s+forget\b/i, 
                /\bdate\b/i, 
                /\banniversary\b/i, 
                /\bbirthday\b/i,
                /\bimportant\b/i,
                /\balert\b/i,
                /\balarm\b/i,
                /\bnotice\b/i,
                /\bnotification\b/i,
                /\bremembrance\b/i,
                /\bmemo\b/i,
                /\bevent\b/i,
                /\bceremony\b/i,
                /\bcelebration\b/i,
                /\bparty\b/i,
                /\bappointment\b/i,
                /\bdeadline\b/i,
                /\bdue\s+date\b/i,
                /\bat\s+\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)/i,
                /\b\d{1,2}(:\d{2})?\s*(am|pm|AM|PM)\b/i,
                /\b(in|after)\s+\d+\s+(minute|hour|day|week|month|year)s?\b/i,
                /\b(tomorrow|today|tonight|next (week|month|year))\b/i,
                /\bin\s+\d+\s+(days|weeks|months|years)\b/i,
                /\bon\s+(mon|tues|wednes|thurs|fri|satur|sun)(day)?\b/i,
                /\bnext\s+(mon|tues|wednes|thurs|fri|satur|sun)(day)?\b/i,
                /\blast\s+(mon|tues|wednes|thurs|fri|satur|sun)(day)?\b/i,
                /\bon\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(st|nd|rd|th)?\b/i,
                /\bnote\s+to\s+self\b/i,
                /\bset\s+a\s+reminder\b/i,
                /\bupcoming\b/i,
                /\b(day|week|month) after\b/i,
                /\b(day|week|month) before\b/i,
                /\boops\b/i,
                /\walmost\s+forgot\b/i,
                /\brevisit\b/i,
                /\bget\s+back\s+to\b/i,
                /\bfollow\s+up\b/i,
                /\bcheck\s+(on|in)\b/i,
                /(\d{1,2})\/(\d{1,2})(\/\d{2,4})?/
            ],
            'Idea': [
                /\bidea\b/i, 
                /\bthought\b/i, 
                /\bcreative\b/i, 
                /\bbrain(storm|storming)\b/i, 
                /\bconcept\b/i,
                /\binnovation\b/i,
                /\binvent(ion)?\b/i,
                /\bnotion\b/i,
                /\bmaybe\b/i, 
                /\bpossibly\b/i,
                /\bperhaps\b/i,
                /\bwhat\s+if\b/i,
                /\bthinking\s+about\b/i,
                /\bcould\b/i,
                /\bimagine\b/i,
                /\binspiration\b/i,
                /\bproposal\b/i,
                /\bsuggestion\b/i,
                /\bhypothesis\b/i,
                /\btheory\b/i,
                /\bvision\b/i,
                /\bperspective\b/i,
                /\bviewpoint\b/i,
                /\bopinion\b/i,
                /\bwonder(ing)?\b/i,
                /\bcurious\b/i,
                /\blet'?s\s+consider\b/i,
                /\binsight\b/i,
                /\bmight\s+be\b/i,
                /^what\s+about\b/i,
                /\bcreate\b/i,
                /\bdesign\b/i,
                /I\s+think\b/i,
                /I\s+believe\b/i,
                /I\s+feel\s+like\b/i,
                /\bmindmap\b/i,
                /\bbrainstorming\b/i,
                /\bplan\b/i,
                /\bconcept(ualize)?\b/i,
                /^(how|why)\s+/i,
                /^(what|where|when|which|who|why|how)\s+.+\?$/i,
                /^.+\?$/
            ],
            'Goal': [
                /\bgoal\b/i, 
                /\btarget\b/i, 
                /\bachieve(ment)?\b/i, 
                /\baspire\b/i,
                /\bambition\b/i,
                /\bresolution\b/i, 
                /\bmilestone\b/i, 
                /\bobjective\b/i,
                /\bdesire\b/i,
                /\bdream\b/i,
                /\bquest\b/i,
                /\bpurpose\b/i,
                /\bmission\b/i,
                /\bvision\b/i,
                /\baim\b/i,
                /\bintention\b/i,
                /\bplan\b/i,
                /\bstrategy\b/i,
                /\bcommitment\b/i,
                /\bdedication\b/i,
                /\bdiscipline\b/i,
                /\bperseverance\b/i,
                /\bchallenge\b/i,
                /\bstretch\b/i,
                /\bsuccess\b/i,
                /\bprogress\b/i,
                /\bgrowth\b/i,
                /\bmeasurement\b/i,
                /\bperformance\b/i,
                /\baccomplishment\b/i,
                /\bfulfillment\b/i,
                /\bi\s+want\s+to\b/i,
                /\bi\s+need\s+to\b/i,
                /\bi'?ll\b/i,
                /\bi\s+will\b/i,
                /\bi\s+should\b/i,
                /\bi\s+must\b/i,
                /\bby\s+the\s+end\s+of\b/i,
                /\bbefore\s+the\s+end\s+of\b/i,
                /\bin\s+\d+\s+(day|week|month|year)s?\b/i,
                /\bby\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
                /\bby\s+\d{4}\b/,
                /\bby\s+next\b/i,
                /\bbecome\s+a\b/i,
                /\blearn\s+(to|how)\b/i,
                /\bmaster\b/i,
                /\bimprove\b/i,
                /\bincrease\b/i,
                /\bdecrease\b/i,
                /\breduce\b/i,
                /\bfocus\s+on\b/i
            ],
            'Note': [
                /\bnote\b/i, 
                /\binformation\b/i, 
                /\bfyi\b/i, 
                /\bdetails?\b/i, 
                /\bfact\b/i,
                /\bobservation\b/i,
                /\bcomment\b/i,
                /\breference\b/i,
                /\bknowledge\b/i,
                /\bdata\b/i,
                /\bresearch\b/i,
                /\bdocumentation\b/i,
                /\banalysis\b/i,
                /\bunderstanding\b/i,
                /\bperception\b/i,
                /\brealization\b/i,
                /\bsummary\b/i,
                /\brevision\b/i,
                /\bcontext\b/i,
                /\binteresting\b/i,
                /\blearned\b/i,
                /\bfound\s+out\b/i,
                /\bdiscovered\b/i,
                /\bto\s+research\b/i,
                /\bworth\s+noting\b/i,
                /\bworth\s+remembering\b/i,
                /\bwanted\s+to\s+say\b/i,
                /\bjust\s+saying\b/i,
                /\bfor\s+(your|my)\s+information\b/i,
                /\bin\s+case\s+you\b/i,
                /\bin\s+case\s+I\b/i,
                /\bdidn'?t\s+know\s+that\b/i,
                /\bnever\s+knew\b/i,
                /^here'?s\b/i,
                /^there'?s\b/i,
                /^this\s+is\b/i,
                /\bthat'?s\s+(interesting|odd|strange|funny|weird|curious|fascinating)\b/i,
                /^I\s+learned\b/i
            ]
        };
        
        // Additional meta-categories for more specific detection
        const metaCategories = {
            'Shopping': [
                /\bbuy\b/i,
                /\bpurchase\b/i,
                /\bget\b/i,
                /\bpick\s+up\b/i,
                /\border\b/i,
                /\bshipment\b/i,
                /\bdelivery\b/i,
                /\bstore\b/i,
                /\bshop\b/i,
                /\bmall\b/i,
                /\bmarket\b/i,
                /\bgrocery\b/i,
                /\bsupermarket\b/i,
                /\bamazon\b/i,
                /\bebay\b/i,
                /\bwish\s?list\b/i,
                /\bcart\b/i,
                /\bcheckout\b/i,
                /\bpayment\b/i,
                /\bproduct\b/i,
                /\bitem\b/i,
                /\bdiscount\b/i,
                /\bcoupon\b/i,
                /\bsale\b/i,
                /\bcost\b/i,
                /\bprice\b/i,
                /\bbudget\b/i,
            ],
            'Communication': [
                /\bcall\b/i,
                /\bemail\b/i,
                /\bmessage\b/i,
                /\btext\b/i,
                /\bsms\b/i,
                /\breply\b/i,
                /\brespond\b/i,
                /\bcontact\b/i,
                /\bphone\b/i,
                /\bvoicemail\b/i,
                /\banswer\b/i,
                /\bask\b/i,
                /\btell\b/i,
                /\bnotify\b/i,
                /\binform\b/i,
                /\balert\b/i,
                /\bupdate\b/i,
                /\brequest\b/i,
                /\bsend\b/i,
                /\bquestion\b/i,
                /\bchat\b/i,
                /\bdiscuss\b/i,
                /\bshare\b/i,
                /\bexplain\b/i,
                /\breachout\b/i,
            ],
            'Health': [
                /\bdoctor\b/i,
                /\bmedical\b/i,
                /\bhospital\b/i,
                /\bclinic\b/i,
                /\bappointment\b/i,
                /\bcheckup\b/i,
                /\bsymptom\b/i,
                /\billness\b/i,
                /\bpain\b/i,
                /\bmedicine\b/i,
                /\bmedication\b/i,
                /\bprescription\b/i,
                /\bpharmacy\b/i,
                /\bdrug\b/i,
                /\bpill\b/i,
                /\btablet\b/i,
                /\bdose\b/i,
                /\bvitamin\b/i,
                /\bsupplement\b/i,
                /\bexercise\b/i,
                /\bworkout\b/i,
                /\bjog\b/i,
                /\brun\b/i,
                /\bswim\b/i,
                /\bgymnasium\b/i,
                /\bgym\b/i,
                /\bdiet\b/i,
                /\bnutrition\b/i,
                /\bweight\b/i,
                /\bhealth(y)?\b/i,
                /\binjury\b/i,
                /\btherapy\b/i,
                /\brecovery\b/i,
                /\bheal(ing)?\b/i,
                /\bwellness\b/i,
                /\bfitness\b/i,
            ],
            'Personal': [
                /\bfamily\b/i,
                /\bfriend\b/i,
                /\brelative\b/i,
                /\bpartner\b/i,
                /\bspouse\b/i,
                /\bwife\b/i,
                /\bhusband\b/i,
                /\bchild\b/i,
                /\bkid\b/i,
                /\bdaughter\b/i,
                /\bson\b/i,
                /\bmother\b/i,
                /\bfather\b/i,
                /\bparent\b/i,
                /\bgrandparent\b/i,
                /\bsibling\b/i,
                /\bsister\b/i,
                /\bbrother\b/i,
                /\baunt\b/i,
                /\buncle\b/i,
                /\bcousin\b/i,
                /\bnephew\b/i,
                /\bniece\b/i,
                /\brelationship\b/i,
                /\bdate\b/i,
                /\bgirlfriend\b/i,
                /\bboyfriend\b/i,
                /\blove\b/i,
                /\bfeelings\b/i,
                /\bemotion\b/i,
                /\bself\b/i,
                /\bpersonal\b/i,
                /\bprivate\b/i,
                /\bintimate\b/i,
                /\bhobby\b/i,
                /\bpassion\b/i,
                /\binterest\b/i,
                /\bleisure\b/i,
                /\bfun\b/i,
                /\brecreation\b/i,
                /\bplay\b/i,
                /\brelax\b/i,
                /\brest\b/i,
                /\bvacation\b/i,
                /\bbreak\b/i,
                /\btime\s+off\b/i,
            ]
        };
        
        // Function to intelligently determine category based on text content
        function determineCategory(text) {
            // Return Task for empty or very short text
            if (!text || text.trim().length < 3) {
                return 'Task';
            }
            
            // Normalize text for analysis - lowercase and trimmed
            const normalizedText = text.trim().toLowerCase();
            
            // Start with a clean slate of scores
            const scores = {
                'Task': 0,
                'Work': 0,
                'Travel': 0,
                'Meeting': 0,
                'Reminder': 0, 
                'Idea': 0,
                'Goal': 0,
                'Note': 0
            };
            
            // FAST TRACK: Specific formats that are definitive indicators
            // ============================================================
            
            // Questions are almost always Ideas
            if (normalizedText.endsWith('?') || /^(what|how|why|when|where|who|which|can|could|would|should|is|are|will)\b.*\?$/i.test(normalizedText)) {
                return 'Idea';
            }
            
            // Bullet points or numbered items are Tasks
            if (/^([-•*✓✔☑☐]) |^\d+\.\s/.test(normalizedText)) {
                return 'Task';
            }
            
            // Date/time patterns strongly indicate Reminders
            const dateTimePatterns = [
                /\b(tomorrow|tonight|today|next week|next month|day after tomorrow)\b/i,
                /\b(mon|tues|wednes|thurs|fri|satur|sun)(day)?\b/i,
                /\bat\s+\d{1,2}(:\d{2})?\s*(am|pm)\b/i,
                /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/i,
                /\bin\s+\d+\s+(minute|hour|day|week|month)/i,
                /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b/,
                /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(st|nd|rd|th)?\b/i, // January 1st
                /\b\d{1,2}(st|nd|rd|th)? of (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i, // 1st of January
                /\bnext (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
                /\b(morning|afternoon|evening|night)\b/i,
                /\b(remind|remember|reminder|don't forget|alert|notification)\b/i
            ];
            
            for (const pattern of dateTimePatterns) {
                if (pattern.test(normalizedText)) {
                    scores['Reminder'] += 4;
                    // If multiple time patterns are found, it's even more likely to be a reminder
                    if (scores['Reminder'] >= 8) {
                        return 'Reminder';
                    }
                }
            }
            
            // Meeting indicators
            const meetingPatterns = [
                /\bmeeting\s+with\b/i,
                /\bcall\s+with\b/i,
                /\b(zoom|teams|webex|hangout|meet|google meet)\s+(call|meeting|conference|session)\b/i,
                /\b(meet|sync|catch\s+up|discuss|talk|chat)\s+with\s+[a-z]+/i,
                /\b(weekly|monthly|daily|quarterly|standup|sprint|planning|review|retro)\s+(meeting|sync|call)\b/i,
                /\b1:1\b|\bone on one\b|\b1 on 1\b/i,
                /\b(interview|presentation|workshop|conference)\b/i
            ];
            
            for (const pattern of meetingPatterns) {
                if (pattern.test(normalizedText)) {
                    scores['Meeting'] += 4;
                    if (scores['Meeting'] >= 4) {
                        return 'Meeting';
                    }
                }
            }
            
            // Travel indicators with expanded patterns
            const travelPatterns = [
                /\b(trip|travel|flight|hotel|book|reservation)\s+to\s+[a-z]+/i,
                /\bvisit(ing)?\s+[a-z]+/i,
                /\b(flight|train|bus|taxi|uber|lyft|car rental|departure|arrival)\b/i,
                /\b(vacation|holiday|getaway|tour|journey|expedition|excursion)\b/i,
                /\b(airport|station|terminal|gate|boarding|check-in)\b/i,
                /\b(passport|visa|itinerary|luggage|packing)\b/i
            ];
            
            for (const pattern of travelPatterns) {
                if (pattern.test(normalizedText)) {
                    scores['Travel'] += 3;
                    if (scores['Travel'] >= 3) {
                        return 'Travel';
                    }
                }
            }
            
            // Work-specific indicators
            const workPatterns = [
                /\b(project|client|report|document|presentation|deadline|deliverable)\b/i,
                /\b(boss|manager|supervisor|colleague|coworker|team)\b/i,
                /\b(email|report|analysis|research|document|proposal|contract)\b/i,
                /\b(review|approve|submit|send|prepare|quarterly|fiscal)\b/i,
                /\b(board|stakeholder|investor|customer|user|product|feature)\b/i
            ];
            
            for (const pattern of workPatterns) {
                if (pattern.test(normalizedText)) {
                    scores['Work'] += 2;
                }
            }
            
            // Goal indicators - first person commitments and more patterns
            const goalPatterns = [
                /^i\s+(want|need|will|plan|aim|hope|intend)\s+to\b/i,
                /\b(goal|objective|milestone|target|aim|resolution|aspiration)\b/i,
                /\b(achieve|accomplish|complete|finish|attain|reach|succeed)\b/i,
                /\b(challenge|improve|boost|enhance|increase|decrease|reduce)\b/i,
                /\b(by end of|within|next year|this year|this month|long term|short term)\b/i,
                /\b(progress|growth|development|advancement|career|promotion)\b/i
            ];
            
            for (const pattern of goalPatterns) {
                if (pattern.test(normalizedText)) {
                    scores['Goal'] += 3;
                    if (scores['Goal'] >= 6) {
                        return 'Goal';
                    }
                }
            }
            
            // Note pattern detection
            const notePatterns = [
                /\b(note|info|information|reference|summary|detail|fact|data)\b/i,
                /\b(fyi|for your info|remember that|take note)\b/i,
                /^(note:|info:|summary:|details:|important:)/i,
                /.+:.+:.+/i, // Detects structured notes with multiple colons
                /\b([a-z]+):([a-z]+)/i // Detects labeled data points
            ];
            
            for (const pattern of notePatterns) {
                if (pattern.test(normalizedText)) {
                    scores['Note'] += 2;
                }
            }
            
            // SIMPLE WORD ANALYSIS: Look for key terms that strongly indicate a category
            // ==========================================================================
            
            // Simple words/phrases that strongly indicate specific categories
            const simpleIndicators = {
                'Task': ['do', 'task', 'todo', 'finish', 'complete', 'handle', 'make', 'create', 'build', 'fix', 'solve', 'repair', 'update', 'modify', 'add', 'implement', 'install', 'configure', 'clean', 'arrange'],
                'Work': ['work', 'project', 'client', 'report', 'document', 'office', 'boss', 'colleague', 'deadline', 'job', 'business', 'corporate', 'company', 'department', 'team', 'meeting', 'presentation'],
                'Meeting': ['meeting', 'discuss', 'catch up', 'sync', 'standup', '1:1', 'meet with', 'call', 'conference', 'zoom', 'teams', 'hangout', 'webex', 'interview', 'consultation', 'briefing'],
                'Reminder': ['remind', 'remember', 'don\'t forget', 'reminder', 'appointment', 'schedule', 'calendar', 'date', 'time', 'alarm', 'alert', 'notification', 'upcoming', 'due'],
                'Idea': ['idea', 'thought', 'maybe', 'perhaps', 'what if', 'consider', 'thinking about', 'brainstorm', 'concept', 'suggestion', 'proposal', 'innovation', 'creativity', 'inspiration'],
                'Goal': ['goal', 'aim', 'achieve', 'objective', 'resolution', 'milestone', 'target', 'aspire', 'ambition', 'dream', 'vision', 'success', 'accomplish', 'attain', 'reach'],
                'Travel': ['travel', 'trip', 'visit', 'flight', 'hotel', 'vacation', 'journey', 'destination', 'tourism', 'holiday', 'booking', 'reservation', 'airport', 'itinerary', 'luggage', 'passport'],
                'Note': ['note', 'info', 'fyi', 'information', 'reference', 'summary', 'observation', 'detail', 'record', 'log', 'documentation', 'important', 'remember', 'highlight']
            };
            
            // Check for simple indicators
            for (const [category, indicators] of Object.entries(simpleIndicators)) {
                for (const word of indicators) {
                    // Check for whole word match
                    const regex = new RegExp(`\\b${word}\\b`, 'i');
                    if (regex.test(normalizedText)) {
                        scores[category] += 2;
                    }
                }
            }
            
            // CONTEXT ANALYSIS: Actions and contexts that indicate categories
            // ==============================================================
            
            // Shopping is a Task
            if (/\b(buy|purchase|get|pick up|shop for|order|acquire|procure)\b/i.test(normalizedText)) {
                scores['Task'] += 3;
            }
            
            // Communication is usually a Task
            if (/\b(call|email|text|message|contact|reply to|respond to|send|write to)\b/i.test(normalizedText) &&
                !/\b(meeting|discuss|talk about)\b/i.test(normalizedText)) {
                scores['Task'] += 2;
            }
            
            // Commands/imperative phrases indicate Tasks
            if (/^(please |kindly )?(make|create|do|add|remove|change|update|check|ensure|verify|set up|organize|arrange|prepare|schedule)/i.test(normalizedText)) {
                scores['Task'] += 3;
            }
            
            // Learning and improvement are Goals
            if (/\b(learn|improve|master|practice|study|train|develop|grow|progress|advance|gain|skill|expertise)\b/i.test(normalizedText)) {
                scores['Goal'] += 2;
            }
            
            // Maintenance and recurring tasks
            if (/\b(daily|weekly|monthly|regularly|routine|maintenance|upkeep|check up)\b/i.test(normalizedText)) {
                scores['Task'] += 2;
            }
            
            // Research and investigation suggest Ideas or Notes
            if (/\b(research|investigate|explore|analyze|study|examine|review|understand)\b/i.test(normalizedText)) {
                scores['Idea'] += 2;
                scores['Note'] += 1;
            }
            
            // Emotional or reflective content is often a Note
            if (/\b(feel|think|believe|opinion|perspective|reflection|thought|impression)\b/i.test(normalizedText)) {
                scores['Note'] += 2;
            }
            
            // LENGTH BASED ANALYSIS: Text length can indicate the type
            // ========================================================
            
            // Very short text is likely a Task
            if (normalizedText.length < 15) {
                scores['Task'] += 1;
            }
            
            // Longer text is more likely a Note
            if (normalizedText.length > 100) {
                scores['Note'] += Math.min(3, Math.floor(normalizedText.length / 50));
            } else if (normalizedText.length > 50) {
                scores['Note'] += 1;
            }
            
            // SENTENCE STRUCTURE ANALYSIS
            // ===========================
            
            // Count sentences - more sentences often indicate a Note
            const sentenceCount = (normalizedText.match(/[.!?]+\s/g) || []).length + 1;
            if (sentenceCount > 2) {
                scores['Note'] += sentenceCount - 1;
            }
            
            // Detect lists (bullet points, numbers, or dashes) which indicate Tasks
            const listPattern = normalizedText.split('\n').filter(line => /^[-*•]|\d+\./.test(line.trim())).length;
            if (listPattern > 0) {
                scores['Task'] += listPattern * 2;
            }
            
            // SPECIAL ADJUSTMENTS: Contextual adjustments based on combinations
            // =================================================================
            
            // If there's mention of both time and action, it's likely a Reminder
            if (scores['Reminder'] > 0 && scores['Task'] > 0) {
                scores['Reminder'] += 1;
            }
            
            // Strong future tense with goals words increases Goal likelihood
            if (/\bwill\s+[a-z]+\b|\bgoing\s+to\s+[a-z]+\b/i.test(normalizedText) && scores['Goal'] > 0) {
                scores['Goal'] += 2;
            }
            
            // RESULT CALCULATION: Find the highest score
            // ==========================================
            let bestCategory = 'Task'; // Default to Task for simplicity
            let maxScore = scores['Task']; // Start with Task score
            
            for (const [category, score] of Object.entries(scores)) {
                if (score > maxScore) {
                    maxScore = score;
                    bestCategory = category;
                }
            }
            
            // FALLBACK: If no clear winner, use these simple defaults
            // =======================================================
            if (maxScore === 0) {
                // If we have no signals at all, we use these simple defaults
                if (normalizedText.length < 20) return 'Task';
                if (normalizedText.split(' ').length <= 5) return 'Task';
                return 'Note';
            }
            
            return bestCategory;
        }
        
        // Get the highest card index from storage to continue counting
        function getHighestCardIndex() {
            const storedCards = getCardsFromStorage();
            if (storedCards.length === 0) return 0;
            
            return Math.max(...storedCards.map(card => card.index));
        }
        
        // Initialize card count from storage
        cardCount = getHighestCardIndex();
        
        // Function to reset input color
        function resetToDefaultColor() {
            pillBar.style.borderColor = defaultColor;
            pillBar.style.boxShadow = defaultShadow;
            
            // Hide category indicator
            const inlineCategory = document.querySelector('.inline-category');
            if (inlineCategory && inlineCategory.classList.contains('active')) {
                inlineCategory.classList.remove('active', 'animate');
                taskInput.classList.remove('with-category');
            }
        }
        
        // Function to update placeholder based on screen width
        function updatePlaceholder() {
            const width = window.innerWidth;
            if (width <= 380) {
                taskInput.placeholder = "Today's focus?";
            } else if (width <= 480) {
                taskInput.placeholder = "What's your goal today?";
            } else {
                taskInput.placeholder = "What are you getting done today?";
            }
        }
        
        // Function to check if task list is scrollable
        function checkScrollable(container) {
            if (container.scrollHeight > container.clientHeight) {
                container.classList.add('scrollable');
            } else {
                container.classList.remove('scrollable');
            }
        }
        
        // Format date and time
        function formatDateTime() {
            const now = new Date();
            const date = now.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            const time = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            return {
                dateStr: date,
                timeStr: time,
                fullStr: `${date} · ${time}`
            };
        }
        
        // Function to show notification
        function showNotification(message, duration = 3000) {
            const notification = document.querySelector('.notification');
            const messageElement = notification.querySelector('.notification-message');
            
            // Set message
            messageElement.textContent = message;
            
            // Show notification
            notification.classList.add('show');
            
            // Hide after duration
            setTimeout(() => {
                notification.classList.remove('show');
            }, duration);
        }
        
        // Save all cards to local storage
        function saveCardsToStorage() {
            const cards = Array.from(document.querySelectorAll('.card'));
            const cardData = cards.map(card => {
                // Get absolute position values for the card
                const left = card.style.left;
                const top = card.style.top;
                
                // Extract card type from class
                let cardType = 'Task'; // Default
                const classMatch = card.className.match(/card-type-(\w+)/);
                if (classMatch && classMatch[1]) {
                    cardType = classMatch[1].charAt(0).toUpperCase() + classMatch[1].slice(1);
                }

                // Get tasks - handle both regular tasks and specialized content
                let tasks = [];
                if (cardType.toLowerCase() === 'note') {
                    // For Note cards, we store the note content
                    const noteContent = card.querySelector('.note-content');
                    if (noteContent) {
                        tasks = [{
                            isNote: true,
                            text: noteContent.innerHTML,
                            completed: false
                        }];
                    }
                } else {
                    // For other cards, get task items
                    tasks = Array.from(card.querySelectorAll('.task-item')).map(taskItem => {
                    const checkbox = taskItem.querySelector('.task-checkbox');
                    const taskText = taskItem.querySelector('.task-text');
                        const dateText = taskItem.querySelector('.date-text');
                        
                        // Handle date items for reminders
                        if (dateText) {
                    return {
                                isDate: true,
                                text: dateText.textContent,
                                completed: false
                            };
                        }
                        
                        return {
                            text: taskText ? taskText.textContent : '',
                            completed: checkbox ? checkbox.checked : false
                    };
                });
                }
                
                // Get special content like reminder times
                const reminderDateTime = card.querySelector('.reminder-datetime');
                const reminderData = {};
                
                if (reminderDateTime) {
                    const reminderDate = reminderDateTime.querySelector('.reminder-date');
                    const reminderTime = reminderDateTime.querySelector('.reminder-time');
                    
                    if (reminderDate) {
                        reminderData.date = reminderDate.textContent;
                    }
                    
                    if (reminderTime) {
                        reminderData.time = reminderTime.textContent;
                    }
                }
                
                return {
                    index: parseInt(card.dataset.index),
                    title: card.querySelector('.card-title').textContent,
                    color: card.style.background,
                    colorIndex: parseInt(card.dataset.colorIndex),
                    textColor: card.style.color || getTextColorForBackground(card.style.background),
                    category: cardType,
                    timestamp: card.querySelector('.card-timestamp').textContent,
                    tasks: tasks,
                    position: {
                        left: left || null,
                        top: top || null
                    },
                    moved: card.dataset.moved === 'true',
                    collapsed: card.classList.contains('collapsed'),
                    completed: card.classList.contains('completed'), // Save completed state
                    reminderData: Object.keys(reminderData).length > 0 ? reminderData : null
                };
            });
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cardData));
        }
        
        // Function to clean up any ghost cards
        function cleanupGhostCards() {
            // Remove any cards with zero opacity that aren't being animated
            const cards = document.querySelectorAll('.card');
            cards.forEach(card => {
                const opacity = parseFloat(getComputedStyle(card).opacity);
                // If the card is nearly invisible and not being interacted with
                if (opacity < 0.1 && !card.classList.contains('dragging')) {
                    card.remove();
                }
            });
            
            // Update positions and save if updateCardStackPositions is defined
            if (typeof updateCardStackPositions === 'function') {
                updateCardStackPositions();
            }
        }
        
        // Function to reindex cards after deletion or completion
        function reindexCards() {
            // Get all cards that are not positioned (in the stack)
            const cards = Array.from(document.querySelectorAll('.card:not(.positioned)'));
            
            // Get highest index 
            let highestIndex = getHighestCardIndex();
            
            // Sort cards by current index (newest first)
            const sortedCards = cards.sort((a, b) => parseInt(b.dataset.index) - parseInt(a.dataset.index));
            
            // Reindex cards sequentially from highest to lowest
            sortedCards.forEach((card, idx) => {
                // Make sure indices are sequential
                card.dataset.index = highestIndex - idx;
            });
        }
        
        // Get cards from local storage
        function getCardsFromStorage() {
            const storedCards = localStorage.getItem(STORAGE_KEY);
            return storedCards ? JSON.parse(storedCards) : [];
        }
        
        // Load cards from storage
        function loadCardsFromStorage() {
            // Clear existing cards first to prevent duplicates
            const existingCards = document.querySelectorAll('.card');
            existingCards.forEach(card => card.remove());
            
            const storedCards = getCardsFromStorage();
            
            // Create each card from storage
            storedCards.forEach(cardData => {
                // Create a new card element
                const card = document.createElement('div');
                
                // Set the card type class based on the category
                const cardTypeLower = cardData.category.toLowerCase();
                card.className = `card card-type-${cardTypeLower}`;
                
                if (cardData.moved) {
                    card.classList.add('positioned');
                }
                
                // Add completed class if card was completed
                if (cardData.completed) {
                    card.classList.add('completed');
                }
                
                card.dataset.index = cardData.index;
                card.dataset.colorIndex = cardData.colorIndex;
                card.dataset.category = cardData.category;
                card.dataset.moved = cardData.moved.toString();
                card.style.background = cardData.color; // Use background instead of backgroundColor for gradients
                
                // Set text color based on saved value or calculate it
                card.style.color = cardData.textColor || getTextColorForBackground(cardData.color);
                
                // Position the card if it has been moved
                if (cardData.moved && cardData.position.left && cardData.position.top) {
                    card.style.position = 'fixed';
                    card.style.left = cardData.position.left;
                    card.style.top = cardData.position.top;
                    card.style.transform = 'none';
                    card.style.opacity = '1'; // Make sure it's visible
                }
                
                if (cardData.collapsed) {
                    card.classList.add('collapsed');
                }
                
                // Get the appropriate icon for the category
                let categoryIcon = getCategoryIcon(cardData.category);
                
                // Get specialized content like reminder date/time
                let specialContent = '';
                if (cardData.category === 'Reminder' && cardData.reminderData) {
                    specialContent = `
                        <div class="reminder-datetime">
                            ${cardData.reminderData.date ? `<span class="reminder-date">${cardData.reminderData.date}</span>` : ''}
                            ${cardData.reminderData.time ? `<span class="reminder-time">${cardData.reminderData.time}</span>` : ''}
                        </div>
                    `;
                }
                
                // Get customized text based on category
                let emptyStateText = 'Add steps to complete your task';
                let ctaText = 'Add step';
                
                switch(cardData.category) {
                    case 'Task':
                        emptyStateText = 'Add steps to complete your task';
                        ctaText = 'Add step';
                        break;
                    case 'Note':
                        emptyStateText = 'Capture your thoughts here';
                        ctaText = 'Add note';
                        break;
                    case 'Reminder':
                        emptyStateText = 'Add important dates or times';
                        ctaText = 'Add date';
                        break;
                    case 'Idea':
                        emptyStateText = 'Expand on your idea';
                        ctaText = 'Add point';
                        break;
                    case 'Meeting':
                        emptyStateText = 'Add meeting agenda items or notes';
                        ctaText = 'Add agenda item';
                        break;
                    case 'Goal':
                        emptyStateText = 'Break down your goal into milestones';
                        ctaText = 'Add milestone';
                        break;
                    case 'Work':
                        emptyStateText = 'List work tasks or deliverables';
                        ctaText = 'Add item';
                        break;
                    case 'Travel':
                        emptyStateText = 'Add destinations or travel items';
                        ctaText = 'Add destination';
                        break;
                }
                
                // Set the complete button text based on completion status
                const completeButtonText = cardData.completed ? 'Reopen Card' : 'Complete Card';
                
                // Create card content
                card.innerHTML = `
                    <div class="card-header">
                        <span class="card-tag">${categoryIcon}${cardData.category}</span>
                        <div class="card-header-controls">
                            <button class="card-due-date" title="Set due date">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                            </button>
                            <button class="card-priority-flag" title="Set priority">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                                    <line x1="4" y1="22" x2="4" y2="15"></line>
                                </svg>
                            </button>
                            <button class="card-complete-button" title="Mark as completed">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 6L9 17l-5-5"></path>
                                </svg>
                            </button>
                            <button class="toggle-collapse">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="18 15 12 9 6 15"></polyline>
                                </svg>
                            </button>
                            <button class="delete-card">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <h2 class="card-title" contenteditable="true">${cardData.title}</h2>
                    ${specialContent}
                    <div class="task-list-container">
                        <ul class="task-list"></ul>
                        <div class="empty-task-list" style="display: ${cardData.tasks.length > 0 ? 'none' : 'flex'}">
                            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            <p>${emptyStateText}</p>
                        </div>
                        <div class="scroll-indicator"></div>
                    </div>
                    <button class="add-step">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        ${ctaText}
                    </button>
                    <div class="card-footer">
                        <div class="color-picker" style="background-color: ${cardData.color};"></div>
                        <div class="card-timestamp">${cardData.timestamp}</div>
                    </div>
                `;
                
                // For Note type cards, we need to add the note content area
                if (cardData.category === 'Note') {
                    setTimeout(() => {
                        const taskList = card.querySelector('.task-list');
                        const noteArea = document.createElement('div');
                        noteArea.className = 'note-content';
                        noteArea.setAttribute('contenteditable', 'true');
                        noteArea.setAttribute('placeholder', 'Write your notes here...');
                        
                        // Add note content if it exists
                        if (cardData.tasks && cardData.tasks.length > 0 && cardData.tasks[0].isNote) {
                            noteArea.innerHTML = cardData.tasks[0].text;
                        }
                        
                        // Replace task list with note area
                        taskList.parentNode.insertBefore(noteArea, taskList);
                        taskList.style.display = 'none';
                        
                        // Hide empty state
                        const emptyState = card.querySelector('.empty-task-list');
                        if (emptyState) {
                            emptyState.style.display = 'none';
                        }
                    }, 100);
                } else {
                // Add tasks to the card
                const taskList = card.querySelector('.task-list');
                    
                    cardData.tasks.forEach(taskData => {
                    const taskItem = document.createElement('li');
                        
                        // Special handling for date items in Reminder cards
                        if (taskData.isDate) {
                            taskItem.className = 'task-item date-item';
                            taskItem.innerHTML = `
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <div class="date-text" contenteditable="true">${taskData.text}</div>
                            `;
                        } else {
                            // Regular task items
                    taskItem.className = 'task-item';
                            
                            // Generate unique ID
                            const taskId = `task-${cardData.index}-${taskList.children.length}`;
                            
                    taskItem.innerHTML = `
                                <input type="checkbox" class="task-checkbox" id="${taskId}" ${taskData.completed ? 'checked' : ''}>
                                <div class="task-text" contenteditable="true">${taskData.text}</div>
                        <button class="delete-task">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    `;
                        }
                        
                    taskList.appendChild(taskItem);
                    });
                    
                    // Set up task event listeners
                    const tasks = card.querySelectorAll('.task-item');
                    tasks.forEach(task => {
                        // Skip setting up events for date items
                        if (task.classList.contains('date-item')) return;
                        
                        setupTaskItemEvents(task, card);
                    });
                }
                
                // Setup card events
                setupCardEvents(card);
                
                // Add event listener for the complete button
                const completeButton = card.querySelector('.card-complete-button');
                if (completeButton) {
                    completeButton.addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent card dragging
                        
                        // Toggle completed state
                        const isCompleted = !card.classList.contains('completed');
                        
                        if (isCompleted) {
                            // Mark as completed
                            card.classList.add('completed');
                            
                            // If the card is not already collapsed, collapse it
                            if (!card.classList.contains('collapsed')) {
                                card.classList.add('collapsed');
                                
                                // Update toggle collapse button icon
                                const toggleCollapseButton = card.querySelector('.toggle-collapse svg polyline');
                                if (toggleCollapseButton) {
                                    toggleCollapseButton.setAttribute('points', '6 9 12 15 18 9');
                                }
                            }
                            
                            // Move to completed section
                            const completedContainer = document.querySelector('.completed-cards-container');
                            if (completedContainer) {
                                // Remove any positioning
                                card.dataset.moved = 'false';
                                card.style.position = '';
                                card.style.left = '';
                                card.style.top = '';
                                
                                // Move to completed section
                                completedContainer.appendChild(card);
                                
                                // Update the count
                                updateCompletedCount();
                                
                                // Update card stack positions to bring next card forward
                                reindexCards();
                                updateCardStackPositions();
                            }
                            
                            showNotification('Card marked as completed!');
                        } else {
                            // Mark as incomplete
                            card.classList.remove('completed');
                            
                            // Move back to main stack
                            const cardsStack = document.querySelector('.cards-stack');
                            if (cardsStack) {
                                cardsStack.appendChild(card);
                                
                                // Update the card positions
                                reindexCards();
                                updateCardStackPositions();
                                
                                // Update the count
                                updateCompletedCount();
                            }
                            
                            showNotification('Card reopened');
                        }
                        
                        // Update the tooltip
                        completeButton.title = isCompleted ? 'Mark as incomplete' : 'Mark as completed';
                        
                        // Update the storage
                        saveCardsToStorage();
                    });
                }
                
                // Add card to the appropriate container based on completion status
                if (cardData.completed) {
                    // Add to completed section
                    const completedContainer = document.querySelector('.completed-cards-container');
                    if (completedContainer) {
                        completedContainer.appendChild(card);
                    }
                } else {
                    // Add to main stack
                    cardsStack.appendChild(card);
                }
            });
            
            // Update the positions of all cards in the main stack
            updateCardStackPositions();
            
            // Update completed cards count
            updateCompletedCount();
        }
        
        // Helper function to get category icon
        function getCategoryIcon(category) {
            let icon = '';
            
            switch(category) {
                case 'Task':
                    icon = `
                        <svg class="category-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 11l3 3L22 4"></path>
                            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                        </svg>
                    `;
                    break;
                case 'Reminder':
                    icon = `
                        <svg class="category-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10 2v2"></path>
                            <path d="M6 6l-2-2"></path>
                            <path d="M14 6l2-2"></path>
                            <circle cx="10" cy="10" r="7"></circle>
                            <path d="M10 6v5l3 3"></path>
                        </svg>
                    `;
                    break;
                case 'Note':
                    icon = `
                        <svg class="category-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                            <path d="M14 2v6h6"></path>
                            <path d="M16 13H8"></path>
                            <path d="M16 17H8"></path>
                            <path d="M10 9H8"></path>
                        </svg>
                    `;
                    break;
                case 'Idea':
                    icon = `
                        <svg class="category-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2a7 7 0 0 1 7 7c0 2.5-2 4.5-3 6.5-1 2-1 3-1 4.5-2 0-4 0-6 0 0-1.5 0-2.5-1-4.5-1-2-3-4-3-6.5a7 7 0 0 1 7-7Z"></path>
                            <path d="M9 16a3 3 0 0 0 6 0"></path>
                        </svg>
                    `;
                    break;
                case 'Meeting':
                    icon = `
                        <svg class="category-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                    `;
                    break;
                case 'Goal':
                    icon = `
                        <svg class="category-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <circle cx="12" cy="12" r="6"></circle>
                            <circle cx="12" cy="12" r="2"></circle>
                        </svg>
                    `;
                    break;
                case 'Work':
                    icon = `
                        <svg class="category-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"></path>
                        </svg>
                    `;
                    break;
                case 'Travel':
                    icon = `
                        <svg class="category-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 17h18"></path>
                            <path d="m16 10-4-4-4 4"></path>
                            <path d="M12 6v9"></path>
                        </svg>
                    `;
                    break;
                default:
                    icon = '';
            }
            
            return icon;
        }
        
        // Update positions only for cards in the stack (not manually positioned)
        function updateCardStackPositions() {
            // Don't apply stacking effects if we're in organized mode
            if (isOrganizeMode) {
                return;
            }
            
            const cards = Array.from(document.querySelectorAll('.card:not(.positioned)'));
            
            // Sort all cards by their index (newest first)
            const sortedCards = cards.sort((a, b) => parseInt(b.dataset.index) - parseInt(a.dataset.index));
            
            // Position each card in the stack
            sortedCards.forEach((card, index) => {
                // Base position is centered
                card.style.opacity = 1;
                
                if (index === 0) {
                    // The newest card is centered
                    card.style.zIndex = 100;
                    card.style.transform = 'translateX(0) scale(1) rotate(0deg)';
                } else if (index < 10) {
                    // First 10 cards visible in a fan
                    const rotation = 4 * index;
                    const zIndex = 100 - index;
                    const opacity = 1 - (index * 0.06);
                    const offsetX = (25 * index);
                    const scale = 1 - (index * 0.03);
                    
                    // Apply transform
                    card.style.zIndex = zIndex;
                    card.style.opacity = opacity;
                    card.style.transform = `translateX(${offsetX}px) scale(${scale}) rotate(${rotation}deg)`;
                } else {
                    // Remaining cards stacked behind with minimal visibility
                    card.style.zIndex = 90 - (index % 10);
                    card.style.opacity = 0.2;
                    card.style.transform = `translateX(220px) scale(0.7) rotate(15deg)`;
                }
            });
            
            // Save to storage after positioning
            saveCardsToStorage();
        }
        
        // Function to setup task item events
        function setupTaskItemEvents(taskItem, card) {
            const deleteTaskButton = taskItem.querySelector('.delete-task');
            const checkbox = taskItem.querySelector('.task-checkbox');
            
            // Add delete functionality for the task
            deleteTaskButton.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Apply fade out animation
                taskItem.style.opacity = '0';
                taskItem.style.height = '0';
                taskItem.style.marginBottom = '0';
                taskItem.style.paddingBottom = '0';
                
                // Remove after animation
                setTimeout(() => {
                    taskItem.remove();
                    
                    // Show empty state if no tasks left
                    const taskList = card.querySelector('.task-list');
                    if (taskList.children.length === 0) {
                        const emptyState = card.querySelector('.empty-task-list');
                        if (emptyState) {
                            emptyState.style.display = 'flex';
                        }
                    }
                    
                    // Update timestamp
                    const newDateTime = formatDateTime();
                    card.querySelector('.card-timestamp').textContent = newDateTime.fullStr;
                    
                    // Save to storage
                    saveCardsToStorage();
                }, 200);
            });
            
            // Add event listener for checkbox changes
            checkbox.addEventListener('change', () => {
                // Update timestamp
                const newDateTime = formatDateTime();
                card.querySelector('.card-timestamp').textContent = newDateTime.fullStr;
                
                // Save to storage
                saveCardsToStorage();
            });
            
            // Make the task text editable
            const taskText = taskItem.querySelector('.task-text');
            taskText.addEventListener('blur', () => {
                saveCardsToStorage();
            });
        }
        
        // Setup all card event listeners
        function setupCardEvents(card) {
            // Make card draggable
            makeDraggable(card);
            
            // Add collapse/expand functionality
            const toggleCollapseButton = card.querySelector('.toggle-collapse');
            toggleCollapseButton.addEventListener('click', (e) => {
                e.stopPropagation();
                
                card.classList.toggle('collapsed');
                
                // Update the icon based on collapsed state
                if (card.classList.contains('collapsed')) {
                    toggleCollapseButton.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    `;
                } else {
                    toggleCollapseButton.innerHTML = `
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                    `;
                }
                
                // Update card positions after collapsing/expanding
                setTimeout(updateCardStackPositions, 50);
                
                // Save to storage
                saveCardsToStorage();
            });
            
            // Add flag button functionality
            const flagButton = card.querySelector('.card-priority-flag');
            // Use setupFlagPriorityButton from flag_priority.js
            setupFlagPriorityButton(flagButton);

            // Add title editing functionality
            const cardTitle = card.querySelector('.card-title');
            cardTitle.addEventListener('focus', () => {
                // Save original text to restore if editing is cancelled
                cardTitle.dataset.originalText = cardTitle.textContent;
            });
            
            cardTitle.addEventListener('blur', () => {
                // Update timestamp when title is edited
                const newDateTime = formatDateTime();
                card.querySelector('.card-timestamp').textContent = newDateTime.fullStr;
                
                // Don't allow empty titles
                if (cardTitle.textContent.trim() === '') {
                    cardTitle.textContent = cardTitle.dataset.originalText || 'Untitled';
                }
                
                // Save to storage
                saveCardsToStorage();
            });
            
            cardTitle.addEventListener('keydown', (e) => {
                // Prevent new lines in title (Enter key)
                if (e.key === 'Enter') {
                    e.preventDefault();
                    cardTitle.blur();
                }
                // Cancel editing on Escape
                if (e.key === 'Escape') {
                    cardTitle.textContent = cardTitle.dataset.originalText;
                    cardTitle.blur();
                }
            });
            
            // Add delete card functionality
            const deleteButton = card.querySelector('.delete-card');
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                
                const confirmDeleteCards = localStorage.getItem('confirmDeleteCards') !== 'false';
                
                if (!confirmDeleteCards || confirm('Are you sure you want to delete this card?')) {
                    // Premium instant deletion with subtle animation
                    // The animation is so quick it feels instantaneous but adds a premium feel
                    card.style.animation = 'deleteCardPremium 0.08s forwards';
                    
                    // Remove card after the super-fast animation
                    // Use requestAnimationFrame for smoother handling
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            card.remove();
                            
                            // Fix stack positioning by reindexing cards
                            reindexCards();
                            updateCardStackPositions();
                            saveCardsToStorage();
                        });
                    });
                }
            });
            
            // Add color picker functionality
            const colorPicker = card.querySelector('.color-picker');
            colorPicker.addEventListener('click', (e) => {
                e.stopPropagation();
                
                let currentColorIdx = parseInt(card.dataset.colorIndex);
                currentColorIdx = (currentColorIdx + 1) % cardColors.length;
                
                const newColor = cardColors[currentColorIdx];
                card.style.background = newColor;
                colorPicker.style.background = newColor;
                card.dataset.colorIndex = currentColorIdx;
                
                // Determine appropriate text color based on background
                const textColor = getTextColorForBackground(newColor);
                card.style.color = textColor;
                
                // Update timestamp
                const newDateTime = formatDateTime();
                card.querySelector('.card-timestamp').textContent = newDateTime.fullStr;
                
                // Save to storage
                saveCardsToStorage();
            });
            
            
            // Add step functionality
            const addStepButton = card.querySelector('.add-step');
            addStepButton.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Hide empty state if present
                const emptyState = card.querySelector('.empty-task-list');
                if (emptyState) {
                    emptyState.style.display = 'none';
                }
                
                const taskList = card.querySelector('.task-list');
                const newItemIndex = taskList.children.length;
                const newItem = document.createElement('li');
                newItem.className = 'task-item';
                
                // Generate unique ID
                const taskId = `task-${card.dataset.index}-${newItemIndex}`;
                
                newItem.innerHTML = `
                    <input type="checkbox" class="task-checkbox" id="${taskId}">
                    <div class="task-text" contenteditable="true"></div>
                    <button class="delete-task">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                `;
                
                taskList.appendChild(newItem);
                
                // Setup task event listeners
                setupTaskItemEvents(newItem, card);
                
                // Make the text editable and focus it
                const taskText = newItem.querySelector('.task-text');
                taskText.focus();
                
                // Update timestamp
                const newDateTime = formatDateTime();
                card.querySelector('.card-timestamp').textContent = newDateTime.fullStr;
                
                // Check if scrollable
                const container = card.querySelector('.task-list-container');
                setTimeout(() => checkScrollable(container), 10);
                
                // Save to storage
                saveCardsToStorage();
            });
        }
        
        // Load cards when the page loads
        document.addEventListener('DOMContentLoaded', () => {
            // Clear any existing cards
            const existingCards = document.querySelectorAll('.card');
            existingCards.forEach(card => card.remove());
            
            // Load cards from storage
            loadCardsFromStorage();
            
            // Clean up any ghost cards after a short delay
            setTimeout(cleanupGhostCards, 1000);
        });
        
        // Initial placeholder update
        updatePlaceholder();
        
        // Update placeholder on resize
        window.addEventListener('resize', updatePlaceholder);
        
        // Listen for input events (when user types)
        taskInput.addEventListener('input', (e) => {
            // Clear any existing timeout
            clearTimeout(typingTimer);
            
            // Get the next color and update the border
            currentColorIndex = (currentColorIndex + 1) % cardColors.length;
            const currentColor = cardColors[currentColorIndex];
            pillBar.style.borderColor = currentColor;
            
            // Add a refined glow effect based on the current color
            pillBar.style.boxShadow = `0 0 15px ${currentColor}60, 0 2px 10px rgba(0, 0, 0, 0.5)`;
            
            // Show the detected category in the UI only if there's actual text
            const hasText = taskInput.value.trim() !== '';
            const predictedCategory = hasText ? determineCategory(taskInput.value) : '';
            
            // Update the inline category indicator
            const inlineCategory = document.querySelector('.inline-category');
            
            if (hasText && predictedCategory) {
                // Update text and show it
                inlineCategory.textContent = predictedCategory;
                
                // If we're changing category, add animation class
                if (!inlineCategory.classList.contains('active') || 
                    inlineCategory.dataset.lastCategory !== predictedCategory) {
                    
                    inlineCategory.classList.remove('animate');
                    void inlineCategory.offsetWidth; // Force reflow to restart animation
                    inlineCategory.classList.add('animate');
                    inlineCategory.dataset.lastCategory = predictedCategory;
                }
                
                // Activate the category and add padding to input
                inlineCategory.classList.add('active');
                taskInput.classList.add('with-category');
                
                // Assign color to match the current typing color
                inlineCategory.style.color = currentColor;
            } else {
                // Hide the category if no text
                inlineCategory.classList.remove('active', 'animate');
                taskInput.classList.remove('with-category');
            }
            
            // Set a timer to reset the color after a pause in typing
            typingTimer = setTimeout(resetToDefaultColor, 800); // Faster reset - 800ms
        });
        
        // Handle form submission (Enter key)
        taskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && taskInput.value.trim() !== '') {
                // Get random color for the card
                const randomColorIndex = Math.floor(Math.random() * cardColors.length);
                const cardColor = cardColors[randomColorIndex];
                
                // Create new card with entered text
                createCard(taskInput.value, cardColor);
                
                // Clear input
                taskInput.value = '';
                
                // Reset color
                resetToDefaultColor();
                currentColorIndex = 0;
            }
        });
        
        // Reset border color when input is cleared
        taskInput.addEventListener('change', () => {
            if (!taskInput.value) {
                resetToDefaultColor();
                currentColorIndex = 0;
            }
        });
        
        // Also reset when the input loses focus
        taskInput.addEventListener('blur', () => {
            resetToDefaultColor();
        });
        
        // But keep the color when input has focus
        taskInput.addEventListener('focus', () => {
            if (taskInput.value) {
                const currentColor = cardColors[currentColorIndex];
                pillBar.style.borderColor = currentColor;
                pillBar.style.boxShadow = `0 0 15px ${currentColor}60, 0 2px 10px rgba(0, 0, 0, 0.5)`;
                
                // Set the timer again
                clearTimeout(typingTimer);
                typingTimer = setTimeout(resetToDefaultColor, typingTimeout);
            }
        });
        
        // Speech functionality handled by voice.js        
        // Settings button color change and subtle animation on click
        settingsButton.addEventListener('click', () => {
            const currentColor = cardColors[currentColorIndex];
            settingsButton.style.color = currentColor;
            settingsButton.style.transform = 'rotate(90deg)';
            
            setTimeout(() => {
                settingsButton.style.color = '';
                settingsButton.style.transform = '';
            }, 800);
        });

        // Settings and theme functionality
        document.addEventListener('DOMContentLoaded', () => {
            // Settings modal elements
            const settingsButton = document.querySelector('.settings-button');
            const settingsModal = document.querySelector('.settings-modal');
            const closeSettingsButton = document.querySelector('.close-settings-btn');
            
            // Navigation elements
            const navItems = document.querySelectorAll('.nav-item');
            const settingsPanels = document.querySelectorAll('.settings-panel');
            
            // Theme toggle buttons
            const darkModeBtn = document.getElementById('dark-mode-btn');
            const lightModeBtn = document.getElementById('light-mode-btn');
            
            // Font size slider
            const fontSizeSlider = document.getElementById('font-size-slider');
            const fontSizeValue = document.querySelector('.slider-value');
            
            // Cards settings
            const maxCardsSelect = document.getElementById('max-cards-setting');
            const showTimestampsCheckbox = document.getElementById('show-timestamps');
            const showCategoriesCheckbox = document.getElementById('show-categories');
            const showCompletedCardsCheckbox = document.getElementById('show-completed-cards');
            
            // Get stored preferences
            const storedTheme = localStorage.getItem('theme') || 'dark';
            const storedFontSize = localStorage.getItem('fontSize') || '100';
            const storedMaxCards = localStorage.getItem('maxCards') || '10';
            const storedShowTimestamps = localStorage.getItem('showTimestamps') !== 'false'; // default to true
            const storedShowCategories = localStorage.getItem('showCategories') !== 'false'; // default to true
            const storedShowCompletedCards = localStorage.getItem('showCompletedCards') !== 'false'; // default to true
            const storedCollapseNewCards = localStorage.getItem('collapseNewCards') === 'true'; // default to false
            const storedConfirmDeleteCards = localStorage.getItem('confirmDeleteCards') !== 'false'; // default to true
            
            // Apply stored theme on load
            if (storedTheme === 'light') {
                document.body.classList.add('light-mode');
                document.body.classList.remove('dark-mode');
                darkModeBtn.classList.remove('active');
                lightModeBtn.classList.add('active');
            } else {
                document.body.classList.add('dark-mode');
                document.body.classList.remove('light-mode');
                darkModeBtn.classList.add('active');
                lightModeBtn.classList.remove('active');
            }
            
            // Apply stored card collapse preference
            const collapseNewCardsCheckbox = document.getElementById('collapse-new-cards');
            if (collapseNewCardsCheckbox) {
                collapseNewCardsCheckbox.checked = storedCollapseNewCards;
            }
            
            // Handle collapse new cards setting
            if (collapseNewCardsCheckbox) {
                collapseNewCardsCheckbox.addEventListener('change', () => {
                    const collapseNewCards = collapseNewCardsCheckbox.checked;
                    localStorage.setItem('collapseNewCards', collapseNewCards);
                    showNotification(`New cards will ${collapseNewCards ? 'be collapsed' : 'expand'} by default`);
                });
            }
            
            // Apply stored confirmation dialog preference
            const confirmDeleteCardsCheckbox = document.getElementById('confirm-delete-cards');
            if (confirmDeleteCardsCheckbox) {
                confirmDeleteCardsCheckbox.checked = storedConfirmDeleteCards;
                
                confirmDeleteCardsCheckbox.addEventListener('change', () => {
                    const confirmDeleteCards = confirmDeleteCardsCheckbox.checked;
                    localStorage.setItem('confirmDeleteCards', confirmDeleteCards);
                    showNotification(`Card deletion confirmation dialog ${confirmDeleteCards ? 'enabled' : 'disabled'}`);
                });
            }
            
            // Modify createCard function to respect collapse preference
            function createCard(text, color) {
                // ... existing createCard code ...
                
                // After creating the card, check if it should be collapsed
                const collapseNewCards = localStorage.getItem('collapseNewCards') === 'true';
                if (collapseNewCards) {
                    card.classList.add('collapsed');
                    const toggleCollapseButton = card.querySelector('.toggle-collapse');
                    if (toggleCollapseButton) {
                        toggleCollapseButton.innerHTML = `
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        `;
                    }
                }
                
                // ... rest of createCard code ...
            }
            
            // Date/Time Picker functionality
            let currentDateTimeCard = null;
            
            function showDateTimePicker(card, event) {
                const picker = document.getElementById('date-time-picker');
                currentDateTimeCard = card;
                
                // Position the picker near the button
                const rect = event.target.getBoundingClientRect();
                picker.style.left = rect.left + 'px';
                picker.style.top = (rect.bottom + 5) + 'px';
                
                // Show the picker
                picker.style.display = 'block';
                
                // Initialize calendar if needed
                initializeCalendar();
            }
            
            // Make this function globally accessible
            function closeDateTimePicker() {
                const picker = document.getElementById('date-time-picker');
                if (picker) {
                    picker.style.display = 'none';
                    currentDateTimeCard = null;
                }
            }
            // Also expose it globally for the cancel button
            window.closeDateTimePicker = closeDateTimePicker;
            
            function initializeCalendar(date = new Date()) {
                const container = document.getElementById('calendar-container');
                const currentMonth = date.getMonth();
                const currentYear = date.getFullYear();
                const today = new Date();
                
                // Create calendar header
                const header = document.createElement('div');
                header.className = 'calendar-header';
                header.innerHTML = `
                    <button class="prev-month">←</button>
                    <span>${new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                    <button class="next-month">→</button>
                `;
                
                // Create calendar grid
                const grid = document.createElement('div');
                grid.className = 'calendar-grid';
                
                // Add day headers
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                days.forEach(day => {
                    const dayHeader = document.createElement('div');
                    dayHeader.className = 'calendar-day-header';
                    dayHeader.textContent = day;
                    grid.appendChild(dayHeader);
                });
                
                // Add date cells
                const firstDay = new Date(currentYear, currentMonth, 1);
                const lastDay = new Date(currentYear, currentMonth + 1, 0);
                const startPadding = firstDay.getDay();
                const totalDays = lastDay.getDate();
                
                // Add padding for start of month
                for (let i = 0; i < startPadding; i++) {
                    const paddingCell = document.createElement('div');
                    paddingCell.className = 'calendar-day padding';
                    grid.appendChild(paddingCell);
                }
                
                // Add days of the month
                for (let day = 1; day <= totalDays; day++) {
                    const dateCell = document.createElement('div');
                    dateCell.className = 'calendar-day';
                    if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
                        dateCell.classList.add('today');
                    }
                    dateCell.textContent = day;
                    dateCell.addEventListener('click', () => selectDate(new Date(currentYear, currentMonth, day)));
                    grid.appendChild(dateCell);
                }
                
                // Clear container and add new calendar
                container.innerHTML = '';
                container.appendChild(header);
                container.appendChild(grid);
                
                // Add event listeners for month navigation
                const prevButton = header.querySelector('.prev-month');
                const nextButton = header.querySelector('.next-month');
                
                prevButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const newDate = new Date(currentYear, currentMonth - 1);
                    initializeCalendar(newDate);
                });
                
                nextButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const newDate = new Date(currentYear, currentMonth + 1);
                    initializeCalendar(newDate);
                });

                // Add event listeners to make days selectable
                const dayCells = grid.querySelectorAll('.calendar-day:not(.padding)');
                dayCells.forEach(cell => {
                    cell.addEventListener('click', function() {
                        // Clear previous selection
                        dayCells.forEach(c => c.classList.remove('selected'));
                        // Mark this day as selected
                        this.classList.add('selected');
                    });
                });
            }
            
            function selectDate(date) {
                if (!currentDateTimeCard) return;
                
                // Format the date
                const formattedDate = date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });
                
                // Get the time values
                const hours = document.getElementById('hours').value;
                const minutes = document.getElementById('minutes').value;
                const period = document.getElementById('period').value;
                
                // Format the time
                const formattedTime = `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
                
                // Update the card with the selected date and time
                updateCardDateTime(currentDateTimeCard, formattedDate, formattedTime);
                
                // Clear previous selections and mark this day as selected
                const dayCells = document.querySelectorAll('.calendar-day:not(.padding)');
                dayCells.forEach(cell => cell.classList.remove('selected'));
                
                // Find the day cell that matches the selected date and mark as selected
                const day = date.getDate();
                const dayCell = Array.from(dayCells).find(cell => parseInt(cell.textContent) === day);
                if (dayCell) {
                    dayCell.classList.add('selected');
                }
                
                // No need to close the picker, as we now use setDateTime() for that
            }
            
            function setDateTime() {
                if (!currentDateTimeCard) return;
                
                // Get the selected date from the calendar
                const selectedDay = document.querySelector('.calendar-day.selected');
                if (!selectedDay) {
                    // If no day is selected, use today's date
                    const today = new Date();
                    const formattedDate = today.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                    });
                    
                    // Get the time values
                    const hours = document.getElementById('hours').value;
                    const minutes = document.getElementById('minutes').value;
                    const period = document.getElementById('period').value;
                    
                    // Format the time
                    const formattedTime = `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
                    
                    // Update the card with the selected date and time
                    updateCardDateTime(currentDateTimeCard, formattedDate, formattedTime);
                } else {
                    // Use the selected date
                    const monthYear = document.querySelector('.calendar-header span').textContent;
                    const day = parseInt(selectedDay.textContent);
                    const date = new Date(`${monthYear} ${day}, ${new Date().getFullYear()}`);
                    
                    // Format the date
                    const formattedDate = date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                    });
                    
                    // Get the time values
                    const hours = document.getElementById('hours').value;
                    const minutes = document.getElementById('minutes').value;
                    const period = document.getElementById('period').value;
                    
                    // Format the time
                    const formattedTime = `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
                    
                    // Update the card with the selected date and time
                    updateCardDateTime(currentDateTimeCard, formattedDate, formattedTime);
                }
                
                // Close the picker
                closeDateTimePicker();
            }
            
            function updateCardDateTime(card, date, time) {
                // Update or create the reminder datetime display
                let reminderDateTime = card.querySelector('.reminder-datetime');
                if (!reminderDateTime) {
                    reminderDateTime = document.createElement('div');
                    reminderDateTime.className = 'reminder-datetime';
                    const cardTitle = card.querySelector('.card-title');
                    cardTitle.after(reminderDateTime);
                }
                
                reminderDateTime.innerHTML = `
                    <span class="reminder-date">${date}</span>
                    <span class="reminder-time">${time}</span>
                `;
                
                // Add reminder badge if one is selected
                const selectedReminder = document.getElementById('reminder-select');
                if (selectedReminder && selectedReminder.value !== 'none') {
                    const minutes = parseInt(selectedReminder.value);
                    const reminderText = minutes === 60 ? '1 hour before' : `${minutes} min before`;
                    
                    const reminderBadge = document.createElement('span');
                    reminderBadge.className = 'reminder-badge';
                    reminderBadge.innerHTML = `
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10 2v2"></path>
                            <path d="M6 6l-2-2"></path>
                            <path d="M14 6l2-2"></path>
                            <circle cx="10" cy="10" r="7"></circle>
                            <path d="M10 6v5l3 3"></path>
                        </svg>
                        ${reminderText}
                    `;
                    reminderDateTime.appendChild(reminderBadge);
                }
                
                // Save to storage
                saveCardsToStorage();
            }
            
            // Add click handler for the due date button
            document.addEventListener('click', (e) => {
                if (e.target.closest('.card-due-date')) {
                    const card = e.target.closest('.card');
                    if (card) {
                        showDateTimePicker(card, e);
                    }
                }
            });
            
            // Close date picker when clicking outside
            document.addEventListener('click', (e) => {
                const picker = document.getElementById('date-time-picker');
                const isClickInside = e.target.closest('.date-picker-container') || e.target.closest('.card-due-date');
                
                if (picker && picker.style.display === 'block' && !isClickInside) {
                    closeDateTimePicker();
                }
            });
            
            // Apply stored font size
            if (fontSizeSlider) {
                fontSizeSlider.value = storedFontSize;
                fontSizeValue.textContent = `${storedFontSize}%`;
                document.documentElement.style.fontSize = `${storedFontSize}%`;
            }
            
            // Apply stored card settings
            if (maxCardsSelect) {
                maxCardsSelect.value = storedMaxCards;
                // Update the maxVisibleCards variable
                window.maxVisibleCards = parseInt(storedMaxCards);
            }
            
            // Apply stored timestamp visibility
            if (showTimestampsCheckbox) {
                showTimestampsCheckbox.checked = storedShowTimestamps;
                updateTimestampVisibility(storedShowTimestamps);
            }
            
            // Apply stored category visibility
            if (showCategoriesCheckbox) {
                showCategoriesCheckbox.checked = storedShowCategories;
                updateCategoryVisibility(storedShowCategories);
            }
            
            // Apply stored completed cards section visibility
            if (showCompletedCardsCheckbox) {
                showCompletedCardsCheckbox.checked = storedShowCompletedCards;
                updateCompletedCardsVisibility(storedShowCompletedCards);
            }
            
            // Toggle settings modal
            settingsButton.addEventListener('click', () => {
                settingsModal.classList.add('show');
            });

            // Search functionality
            const searchButton = document.querySelector('.search-button');
            const searchPopup = document.getElementById('search-popup');
            const searchInput = document.querySelector('.search-input');
            const searchResults = document.getElementById('search-results');
            const resultsCount = document.querySelector('.results-count');
            const resultsList = document.querySelector('.search-results-list');
            const filterBtn = document.getElementById('filter-btn');
            const filterDropdown = document.getElementById('filter-dropdown');
            const clearFiltersBtn = document.querySelector('.clear-filters-btn');
            const applyFiltersBtn = document.querySelector('.apply-filters-btn');
            
            let activeFilters = new Set();
            
            if (searchButton && searchPopup) {
                searchButton.addEventListener('click', () => {
                    // Toggle search popup
                    if (searchPopup.style.display === 'none' || searchPopup.style.display === '') {
                        searchPopup.style.display = 'block';
                        if (searchInput) {
                            searchInput.focus();
                        }
                    } else {
                        searchPopup.style.display = 'none';
                        if (searchResults) {
                            searchResults.style.display = 'none';
                        }
                        if (filterDropdown) {
                            filterDropdown.style.display = 'none';
                            filterBtn.classList.remove('active');
                        }
                        if (searchInput) {
                            searchInput.value = '';
                        }
                    }
                    
                    // Add visual feedback
                    const currentColor = cardColors[currentColorIndex];
                    searchButton.style.color = currentColor;
                    searchButton.style.transform = 'scale(1.2)';
                    
                    setTimeout(() => {
                        searchButton.style.color = '';
                        searchButton.style.transform = '';
                    }, 200);
                });

                // Real-time search as user types
                if (searchInput) {
                    searchInput.addEventListener('input', () => {
                        const query = searchInput.value.trim().toLowerCase();
                        
                        if (query.length === 0) {
                            searchResults.style.display = 'none';
                            return;
                        }

                        performSearch(query);
                    });

                    // Close search on Escape
                    searchInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape') {
                            searchPopup.style.display = 'none';
                            searchResults.style.display = 'none';
                            filterDropdown.style.display = 'none';
                            searchInput.value = '';
                        }
                    });
                }

                // Filter button functionality
                if (filterBtn) {
                    filterBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const isVisible = filterDropdown.style.display === 'block';
                        filterDropdown.style.display = isVisible ? 'none' : 'block';
                        filterBtn.classList.toggle('active', !isVisible);
                    });
                }

                // Filter actions
                if (clearFiltersBtn) {
                    clearFiltersBtn.addEventListener('click', () => {
                        // Clear all checkboxes
                        document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
                            checkbox.checked = false;
                        });
                        activeFilters.clear();
                        updateFilterButtonState();
                        performSearch(searchInput.value.trim().toLowerCase());
                    });
                }

                if (applyFiltersBtn) {
                    applyFiltersBtn.addEventListener('click', () => {
                        // Update active filters
                        activeFilters.clear();
                        document.querySelectorAll('.filter-checkbox:checked').forEach(checkbox => {
                            activeFilters.add(checkbox.dataset.filter);
                        });
                        updateFilterButtonState();
                        filterDropdown.style.display = 'none';
                        performSearch(searchInput.value.trim().toLowerCase());
                    });
                }

                // Filter checkbox change handlers
                document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', () => {
                        // Real-time filtering as checkboxes change
                        activeFilters.clear();
                        document.querySelectorAll('.filter-checkbox:checked').forEach(cb => {
                            activeFilters.add(cb.dataset.filter);
                        });
                        updateFilterButtonState();
                        performSearch(searchInput.value.trim().toLowerCase());
                    });
                });

                // Close filter dropdown when clicking outside
                document.addEventListener('click', (e) => {
                    if (filterDropdown && filterDropdown.style.display === 'block') {
                        // Check if click is outside the filter dropdown and filter button
                        if (!filterDropdown.contains(e.target) && !filterBtn.contains(e.target)) {
                            filterDropdown.style.display = 'none';
                            filterBtn.classList.remove('active');
                        }
                    }
                });
            }

            // Update filter button visual state
            function updateFilterButtonState() {
                if (filterBtn) {
                    if (activeFilters.size > 0) {
                        filterBtn.classList.add('active');
                    } else {
                        filterBtn.classList.remove('active');
                    }
                }
            }

            // Search function
            function performSearch(query) {
                const allCards = document.querySelectorAll('.card');
                const matchingCards = [];

                allCards.forEach(card => {
                    const cardData = extractCardSearchData(card);
                    if (cardData && matchesSearchAndFilters(cardData, query)) {
                        matchingCards.push({ card, data: cardData, query });
                    }
                });

                displaySearchResults(matchingCards, query);
            }

            // Check if card matches search query and active filters
            function matchesSearchAndFilters(cardData, query) {
                // Check text search
                const matchesSearch = !query || cardData.searchText.includes(query);
                if (!matchesSearch) return false;

                // Check filters
                if (activeFilters.size === 0) return true;

                return Array.from(activeFilters).some(filter => {
                    switch (filter) {
                        case 'completed':
                            return cardData.completed;
                        case 'pending':
                            return !cardData.completed;
                        case 'task':
                            return cardData.category.toLowerCase().includes('task');
                        case 'project':
                            return cardData.category.toLowerCase().includes('project');
                        case 'note':
                            return cardData.category.toLowerCase().includes('note');
                        case 'reminder':
                            return cardData.category.toLowerCase().includes('reminder');
                        case 'today':
                            return cardData.isToday;
                        case 'this-week':
                            return cardData.isThisWeek;
                        case 'this-month':
                            return cardData.isThisMonth;
                        default:
                            return false;
                    }
                });
            }

            // Extract searchable data from card
            function extractCardSearchData(cardElement) {
                try {
                    const titleElement = cardElement.querySelector('.card-title');
                    const categoryElement = cardElement.querySelector('.card-tag');
                    const taskElements = cardElement.querySelectorAll('.task-text');
                    const timestampElement = cardElement.querySelector('.card-timestamp');

                    const title = titleElement ? titleElement.textContent.trim() : '';
                    const category = categoryElement ? categoryElement.textContent.trim() : '';
                    const timestamp = timestampElement ? timestampElement.textContent.trim() : '';
                    const completed = cardElement.classList.contains('completed');

                    // Get all task texts
                    const tasks = [];
                    taskElements.forEach(taskEl => {
                        const text = taskEl.textContent.trim();
                        if (text) tasks.push(text);
                    });

                    // Create searchable text
                    const searchText = `${title} ${category} ${tasks.join(' ')}`.toLowerCase();

                    // Parse date for filtering
                    const cardDate = parseCardDate(timestamp);
                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    const weekStart = new Date(today);
                    weekStart.setDate(today.getDate() - today.getDay());
                    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

                    return {
                        title,
                        category,
                        tasks,
                        timestamp,
                        completed,
                        searchText,
                        cardDate,
                        isToday: cardDate >= today && cardDate < new Date(today.getTime() + 24 * 60 * 60 * 1000),
                        isThisWeek: cardDate >= weekStart,
                        isThisMonth: cardDate >= monthStart
                    };
                } catch (error) {
                    // Error extracting card data - skip this card
                    return null;
                }
            }

            // Parse card date from timestamp
            function parseCardDate(timestamp) {
                try {
                    // Try to parse various date formats
                    const date = new Date(timestamp);
                    if (!isNaN(date.getTime())) {
                        return date;
                    }
                    
                    // Try parsing common formats
                    const patterns = [
                        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
                        /(\d{4})-(\d{1,2})-(\d{1,2})/, // YYYY-MM-DD
                    ];
                    
                    for (const pattern of patterns) {
                        const match = timestamp.match(pattern);
                        if (match) {
                            const [, a, b, c] = match;
                            // Try both MM/DD/YYYY and YYYY-MM-DD formats
                            const date1 = new Date(c, a - 1, b); // MM/DD/YYYY
                            const date2 = new Date(a, b - 1, c); // YYYY-MM-DD
                            return !isNaN(date1.getTime()) ? date1 : date2;
                        }
                    }
                    
                    return new Date(); // fallback to current date
                } catch {
                    return new Date();
                }
            }

            // Display search results
            function displaySearchResults(matchingCards, query) {
                if (!searchResults || !resultsCount || !resultsList) return;

                // Show results container
                searchResults.style.display = 'block';

                // Update count
                resultsCount.textContent = `${matchingCards.length} card${matchingCards.length !== 1 ? 's' : ''} found`;

                // Clear previous results
                resultsList.innerHTML = '';

                if (matchingCards.length === 0) {
                    resultsList.innerHTML = `
                        <div style="text-align: center; padding: 20px; color: var(--text-muted);">
                            No cards found for "${query}"
                        </div>
                    `;
                    return;
                }

                // Display matching cards
                matchingCards.forEach(({ card, data, query }) => {
                    const resultItem = createSearchResultItem(data, query, card);
                    resultsList.appendChild(resultItem);
                });
            }

            // Create individual search result item
            function createSearchResultItem(cardData, query, cardElement) {
                const item = document.createElement('div');
                item.className = 'search-result-item';

                // Highlight matching text
                const highlightedTitle = highlightText(cardData.title, query);
                
                // Create badges
                const badges = [];
                if (cardData.completed) {
                    badges.push('<span class="search-result-badge" style="background: rgba(76, 175, 80, 0.2); color: #4CAF50;">Completed</span>');
                }
                if (cardData.category) {
                    badges.push(`<span class="search-result-badge">${cardData.category}</span>`);
                }
                if (cardData.tasks.length > 0) {
                    badges.push(`<span class="search-result-badge">${cardData.tasks.length} task${cardData.tasks.length !== 1 ? 's' : ''}</span>`);
                }

                item.innerHTML = `
                    <div class="search-result-title">${highlightedTitle}</div>
                    <div class="search-result-details">
                        <span>${cardData.timestamp}</span>
                        ${badges.join('')}
                    </div>
                `;

                // Click to focus on card
                item.addEventListener('click', () => {
                    focusOnCard(cardElement);
                    // Close search
                    searchPopup.style.display = 'none';
                    searchResults.style.display = 'none';
                    searchInput.value = '';
                });

                return item;
            }

            // Highlight matching text
            function highlightText(text, query) {
                if (!query || !text) return text;
                
                const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                return text.replace(regex, '<span class="search-highlight">$1</span>');
            }

            // Focus on specific card
            function focusOnCard(cardElement) {
                if (!cardElement) return;

                // Expand card if it's collapsed
                if (cardElement.classList.contains('collapsed')) {
                    cardElement.classList.remove('collapsed');
                    
                    // Update toggle button icon
                    const toggleButton = cardElement.querySelector('.toggle-collapse svg polyline');
                    if (toggleButton) {
                        toggleButton.setAttribute('points', '18 15 12 9 6 15');
                    }
                }

                // Scroll to card smoothly
                cardElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center',
                    inline: 'center'
                });

                // Add dramatic highlight effect
                const originalTransform = cardElement.style.transform;
                const originalZIndex = cardElement.style.zIndex;
                const originalBoxShadow = cardElement.style.boxShadow;
                
                // Bring card forward and highlight
                cardElement.style.zIndex = '9999';
                cardElement.style.outline = '3px solid #5CB8FF';
                cardElement.style.outlineOffset = '3px';
                cardElement.style.boxShadow = '0 10px 40px rgba(92, 184, 255, 0.5)';
                cardElement.style.transform = `${originalTransform} scale(1.05)`;
                
                // Add pulsing animation
                cardElement.style.animation = 'cardPulse 0.5s ease-in-out';

                // Reset after highlight period
                setTimeout(() => {
                    cardElement.style.outline = '';
                    cardElement.style.outlineOffset = '';
                    cardElement.style.boxShadow = originalBoxShadow;
                    cardElement.style.transform = originalTransform;
                    cardElement.style.zIndex = originalZIndex;
                    cardElement.style.animation = '';
                }, 2500);
            }
            
            // Close settings modal
            if (closeSettingsButton) {
                closeSettingsButton.addEventListener('click', () => {
                    settingsModal.classList.remove('show');
                });
            }

            // Organize functionality
            const organizeButton = document.querySelector('.organize-button');
            const analyticsPanel = document.getElementById('analytics-panel');
            const closeAnalytics = document.querySelector('.close-analytics');
            const collapseAnalytics = document.getElementById('collapse-analytics');
            let originalCardPositions = new Map();

            if (organizeButton) {
                organizeButton.addEventListener('click', () => {
                    toggleOrganizeMode();
                    
                    // Add visual feedback
                    const currentColor = cardColors[currentColorIndex];
                    organizeButton.style.color = currentColor;
                    organizeButton.style.transform = 'scale(1.2)';
                    
                    setTimeout(() => {
                        if (!isOrganizeMode) {
                            organizeButton.style.color = '';
                        }
                        organizeButton.style.transform = '';
                    }, 200);
                });
            }

            if (closeAnalytics) {
                closeAnalytics.addEventListener('click', () => {
                    if (isOrganizeMode) {
                        toggleOrganizeMode();
                    }
                });
            }

            if (collapseAnalytics) {
                collapseAnalytics.addEventListener('click', (e) => {
                    e.stopPropagation();
                    analyticsPanel.classList.toggle('collapsed');
                });
            }

            // Also allow clicking header to collapse/expand
            const analyticsHeader = document.querySelector('.analytics-header');
            if (analyticsHeader) {
                analyticsHeader.addEventListener('click', (e) => {
                    // Don't trigger if clicking on buttons
                    if (!e.target.closest('button')) {
                        analyticsPanel.classList.toggle('collapsed');
                    }
                });
            }

            function toggleOrganizeMode() {
                isOrganizeMode = !isOrganizeMode;
                
                if (isOrganizeMode) {
                    enterOrganizeMode();
                } else {
                    exitOrganizeMode();
                }
            }

            function enterOrganizeMode() {
                // Save original positions
                saveOriginalPositions();
                
                // Organize cards by category
                organizeCardsByCategory();
                
                // Show analytics
                generateAnalytics();
                analyticsPanel.style.display = 'block';
                organizeButton.classList.add('active');
            }

            function exitOrganizeMode() {
                // Remove category headers
                document.querySelectorAll('.category-header').forEach(header => header.remove());
                
                // Restore original positions
                restoreOriginalPositions();
                
                // Hide analytics
                analyticsPanel.style.display = 'none';
                organizeButton.classList.remove('active');
            }

            function saveOriginalPositions() {
                originalCardPositions.clear();
                const cards = document.querySelectorAll('.card');
                cards.forEach(card => {
                    originalCardPositions.set(card, {
                        left: card.style.left,
                        top: card.style.top,
                        position: card.style.position,
                        transform: card.style.transform,
                        zIndex: card.style.zIndex
                    });
                });
            }

            function restoreOriginalPositions() {
                originalCardPositions.forEach((position, card) => {
                    card.style.left = position.left;
                    card.style.top = position.top;
                    card.style.position = position.position;
                    card.style.transform = position.transform;
                    card.style.zIndex = position.zIndex;
                });
            }

            function organizeCardsByCategory() {
                // Remove any existing category headers
                document.querySelectorAll('.category-header').forEach(header => header.remove());
                
                const cards = Array.from(document.querySelectorAll('.card'));
                const categories = {};

                // Group cards by category
                cards.forEach(card => {
                    const categoryElement = card.querySelector('.card-tag');
                    const category = categoryElement ? categoryElement.textContent.trim() : 'Uncategorized';
                    
                    if (!categories[category]) {
                        categories[category] = [];
                    }
                    categories[category].push(card);
                });

                // Position cards in 2 columns with proper group spacing
                const analyticsWidth = 320;
                const startX = analyticsWidth + 50;
                const startY = 120;
                const columnWidth = 280;
                const columnSpacing = 150;
                const cardSpacing = 20; // Increased spacing between cards
                const groupHeaderHeight = 40; // Increased header space
                const groupBottomMargin = 50; // Increased margin between groups
                const cardHeight = 80; // Approximate height of each card

                const categoryNames = Object.keys(categories);
                
                // Track the current Y position for each column
                const columnYPositions = [startY, startY];
                
                categoryNames.forEach((category, index) => {
                    const groupCards = categories[category];
                    const columnIndex = index % 2;
                    
                    const columnX = startX + (columnIndex * (columnWidth + columnSpacing));
                    const currentY = columnYPositions[columnIndex];
                    
                    // Create category header
                    createCategoryHeader(category, columnX, currentY, columnWidth, groupCards.length);
                    
                    // Position cards in this group
                    const cardsStartY = currentY + groupHeaderHeight;
                    groupCards.forEach((card, cardIndex) => {
                        card.style.position = 'fixed';
                        card.style.left = `${columnX}px`;
                        card.style.top = `${cardsStartY + (cardIndex * (cardHeight + cardSpacing))}px`;
                        card.style.zIndex = '5';
                        card.style.transform = 'none';
                    });
                    
                    // Calculate actual group height based on card positions and size
                    const actualGroupHeight = groupHeaderHeight + 
                                            (groupCards.length * (cardHeight + cardSpacing)) + 
                                            groupBottomMargin;
                    
                    // Update the Y position for this column
                    columnYPositions[columnIndex] += actualGroupHeight;
                });
            }

            function createCategoryHeader(category, x, y, width, count) {
                const header = document.createElement('div');
                header.className = 'category-header';
                header.style.cssText = `
                    position: fixed;
                    left: ${x}px;
                    top: ${y}px;
                    width: ${width}px;
                    height: 30px;
                    background: var(--pill-border);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0 12px;
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--text-color);
                    z-index: 6;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    margin-bottom: 5px;
                `;
                
                header.innerHTML = `
                    <span>${category}</span>
                    <span style="background: rgba(92, 184, 255, 0.2); color: #5CB8FF; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${count}</span>
                `;
                
                document.body.appendChild(header);
            }

            function generateAnalytics() {
                const cards = Array.from(document.querySelectorAll('.card'));
                const analytics = {
                    total: cards.length,
                    completed: 0,
                    pending: 0,
                    categories: {}
                };

                cards.forEach(card => {
                    const isCompleted = card.classList.contains('completed');
                    const categoryElement = card.querySelector('.card-tag');
                    const category = categoryElement ? categoryElement.textContent.trim() : 'Uncategorized';

                    if (isCompleted) {
                        analytics.completed++;
                    } else {
                        analytics.pending++;
                    }

                    if (!analytics.categories[category]) {
                        analytics.categories[category] = { total: 0, completed: 0 };
                    }
                    analytics.categories[category].total++;
                    if (isCompleted) {
                        analytics.categories[category].completed++;
                    }
                });

                updateAnalyticsPanel(analytics);
            }

            function updateAnalyticsPanel(analytics) {
                // Update summary stats
                document.getElementById('total-cards').textContent = analytics.total;
                document.getElementById('completed-cards').textContent = analytics.completed;
                document.getElementById('pending-cards').textContent = analytics.pending;

                // Update breakdown
                const breakdown = document.getElementById('analytics-breakdown');
                breakdown.innerHTML = '<h4 style="margin: 0 0 10px 0; color: var(--text-color); font-size: 14px;">By Category</h4>';

                Object.keys(analytics.categories).forEach(category => {
                    const data = analytics.categories[category];
                    const completionRate = Math.round((data.completed / data.total) * 100);
                    
                    const categoryDiv = document.createElement('div');
                    categoryDiv.className = 'category-stat';
                    categoryDiv.innerHTML = `
                        <div>
                            <span class="category-name">${category}</span>
                            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                                ${data.completed}/${data.total} completed (${completionRate}%)
                            </div>
                        </div>
                        <span class="category-count">${data.total}</span>
                    `;
                    breakdown.appendChild(categoryDiv);
                });
            }
            
            // Close settings modal with X button
            const closeXButton = document.getElementById('settings-close-x');
            if (closeXButton) {
                closeXButton.addEventListener('click', () => {
                    settingsModal.classList.remove('show');
                });
            }
            
            // Close modal when clicking outside of it
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    settingsModal.classList.remove('show');
                }
            });
            
            // Close modal when pressing Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    settingsModal.classList.remove('show');
                }
            });
            
            // Handle navigation between settings panels
            navItems.forEach(item => {
                item.addEventListener('click', () => {
                    // Update active nav item
                    navItems.forEach(nav => nav.classList.remove('active'));
                    item.classList.add('active');
                    
                    // Show corresponding panel
                    const targetPanel = document.getElementById(`${item.dataset.target}-panel`);
                    if (targetPanel) {
                        settingsPanels.forEach(panel => panel.classList.remove('active'));
                        targetPanel.classList.add('active');
                    }
                });
            });
            
            // Handle theme toggle
            darkModeBtn.addEventListener('click', () => {
                if (!darkModeBtn.classList.contains('active')) {
                    // Switch to dark mode
                    document.body.classList.add('dark-mode');
                    document.body.classList.remove('light-mode');
                    darkModeBtn.classList.add('active');
                    lightModeBtn.classList.remove('active');
                    localStorage.setItem('theme', 'dark');
                }
            });
            
            lightModeBtn.addEventListener('click', () => {
                if (!lightModeBtn.classList.contains('active')) {
                    // Switch to light mode
                    document.body.classList.add('light-mode');
                    document.body.classList.remove('dark-mode');
                    lightModeBtn.classList.add('active');
                    darkModeBtn.classList.remove('active');
                    localStorage.setItem('theme', 'light');
                }
            });
            
            // Handle font size slider
            if (fontSizeSlider) {
                fontSizeSlider.addEventListener('input', () => {
                    const fontSize = fontSizeSlider.value;
                    fontSizeValue.textContent = `${fontSize}%`;
                    document.documentElement.style.fontSize = `${fontSize}%`;
                    localStorage.setItem('fontSize', fontSize);
                });
            }
            
            // Handle max cards setting
            if (maxCardsSelect) {
                maxCardsSelect.addEventListener('change', () => {
                    const maxCards = maxCardsSelect.value;
                    localStorage.setItem('maxCards', maxCards);
                    window.maxVisibleCards = parseInt(maxCards);
                    showNotification(`Maximum cards set to ${maxCards}`);
                });
            }
            
            // Handle timestamp visibility setting
            if (showTimestampsCheckbox) {
                showTimestampsCheckbox.addEventListener('change', () => {
                    const showTimestamps = showTimestampsCheckbox.checked;
                    localStorage.setItem('showTimestamps', showTimestamps);
                    updateTimestampVisibility(showTimestamps);
                });
            }
            
            // Handle category visibility setting
            if (showCategoriesCheckbox) {
                showCategoriesCheckbox.addEventListener('change', () => {
                    const showCategories = showCategoriesCheckbox.checked;
                    localStorage.setItem('showCategories', showCategories);
                    updateCategoryVisibility(showCategories);
                });
            }
            
            // Handle completed cards section visibility setting
            if (showCompletedCardsCheckbox) {
                showCompletedCardsCheckbox.addEventListener('change', () => {
                    const showCompletedCards = showCompletedCardsCheckbox.checked;
                    localStorage.setItem('showCompletedCards', showCompletedCards);
                    updateCompletedCardsVisibility(showCompletedCards);
                    showNotification(`Completed cards section ${showCompletedCards ? 'visible' : 'hidden'}`);
                });
            }
            
            // Update timestamp visibility
            function updateTimestampVisibility(show) {
                const timestamps = document.querySelectorAll('.card-timestamp');
                timestamps.forEach(timestamp => {
                    timestamp.style.display = show ? 'block' : 'none';
                });
            }
            
            // Update category visibility
            function updateCategoryVisibility(show) {
                const categories = document.querySelectorAll('.card-tag');
                categories.forEach(category => {
                    category.style.display = show ? 'inline-block' : 'none';
                });
            }
            
            // Update completed cards section visibility
            function updateCompletedCardsVisibility(show) {
                const completedSection = document.querySelector('.completed-cards-section');
                if (completedSection) {
                    // If we should hide the section, set to 'none'
                    // Otherwise, we'll let the updateCompletedCount function handle it based on count
                    if (!show) {
                        completedSection.style.display = 'none';
                    } else {
                        // Call updateCompletedCount to set proper visibility based on count
                        updateCompletedCount();
                    }
                }
            }
            
            // Handle data export
            const exportDataBtn = document.getElementById('export-data');
            if (exportDataBtn) {
                exportDataBtn.addEventListener('click', () => {
                    const cardsData = localStorage.getItem(STORAGE_KEY);
                    if (cardsData) {
                        const blob = new Blob([cardsData], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `task_cards_backup_${new Date().toISOString().split('T')[0]}.json`;
                        document.body.appendChild(a);
                        a.click();
                        
                        setTimeout(() => {
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                        }, 0);
                        
                        showNotification('Data exported successfully!');
                    } else {
                        showNotification('No data to export');
                    }
                });
            }
            
            // Handle data import
            const importDataBtn = document.getElementById('import-data');
            if (importDataBtn) {
                importDataBtn.addEventListener('click', () => {
                    // Create a file input element
                    const fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.json';
                    
                    fileInput.addEventListener('change', (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            try {
                                const data = JSON.parse(event.target.result);
                                // Validate the data format (basic check)
                                if (Array.isArray(data) && data.length > 0 && data[0].hasOwnProperty('title')) {
                                    // Store the imported data
                                    localStorage.setItem(STORAGE_KEY, event.target.result);
                                    showNotification('Data imported successfully! Reloading...');
                                    
                                    // Reload the page after a short delay
                                    setTimeout(() => {
                                        window.location.reload();
                                    }, 1500);
                                } else {
                                    showNotification('Invalid data format');
                                }
                            } catch (error) {
                                showNotification('Error importing data: ' + error.message);
                            }
                        };
                        reader.readAsText(file);
                    });
                    
                    fileInput.click();
                });
            }
            
            // Handle data clearing
            const clearDataBtn = document.getElementById('clear-data');
            if (clearDataBtn) {
                clearDataBtn.addEventListener('click', () => {
                    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                        localStorage.removeItem(STORAGE_KEY);
                        showNotification('All data cleared successfully!');
                        
                        // Reload the page after a short delay
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    }
                });
            }
            
            // Handle calendar integration
            const calendarButtons = document.querySelectorAll('.connect-calendar-btn');
            calendarButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const provider = button.dataset.provider;
                    
                    // This would typically call an OAuth flow, which requires a backend
                    // For demo purposes, we'll simulate a successful connection
                    showNotification(`${provider.charAt(0).toUpperCase() + provider.slice(1)} Calendar integration requires backend setup`);
                    
                    // Show a modal explaining the integration process
                    const modalHTML = `
                        <div class="modal-content">
                            <h2>Calendar Integration</h2>
                            <p>Connecting to ${provider.charAt(0).toUpperCase() + provider.slice(1)} Calendar requires:</p>
                            <ul>
                                <li>Backend server for OAuth handling</li>
                                <li>API keys for ${provider} Calendar API</li>
                                <li>User authentication flow</li>
                            </ul>
                            <p>This feature would allow you to:</p>
                            <ul>
                                <li>Sync reminder cards to your calendar</li>
                                <li>Import calendar events as cards</li>
                                <li>Set up notifications for due dates</li>
                                <li>View your calendar events within the app</li>
                            </ul>
                            <p>In a production environment, this would open a secure authentication window to connect your account.</p>
                            <div class="modal-actions">
                                <button class="modal-close-btn">Close</button>
                            </div>
                        </div>
                    `;
                    
                    const modal = document.createElement('div');
                    modal.className = 'modal calendar-auth-modal';
                    modal.innerHTML = modalHTML;
                    document.body.appendChild(modal);
                    
                    // Show the modal
                    setTimeout(() => {
                        modal.classList.add('active');
                    }, 10);
                    
                    // Add close button functionality
                    const closeButton = modal.querySelector('.modal-close-btn');
                    closeButton.addEventListener('click', () => {
                        modal.classList.remove('active');
                        setTimeout(() => {
                            document.body.removeChild(modal);
                        }, 300);
                    });
                });
            });
        });

        // Add blur event listener to handle when focus is lost
        taskInput.addEventListener('blur', () => {
            // If input is empty when losing focus, ensure the indicator is hidden
            if (taskInput.value.trim() === '') {
                const inlineCategory = document.querySelector('.inline-category');
                inlineCategory.classList.remove('active', 'animate');
                taskInput.classList.remove('with-category');
            }
        });
        
        // Add focus event to update the UI state when focused
        taskInput.addEventListener('focus', () => {
            // If input has text when gaining focus, show the indicator
            if (taskInput.value.trim() !== '') {
                const predictedCategory = determineCategory(taskInput.value);
                const inlineCategory = document.querySelector('.inline-category');
                
                if (predictedCategory) {
                    inlineCategory.textContent = predictedCategory;
                    inlineCategory.classList.add('active');
                    taskInput.classList.add('with-category');
                }
            }
        });

        // Function to update the completed cards count
        function updateCompletedCount() {
            const completedContainer = document.querySelector('.completed-cards-container');
            const countElement = document.querySelector('.completed-cards-count');
            
            if (completedContainer && countElement) {
                const count = completedContainer.children.length;
                countElement.textContent = count;
                
                // Hide or show the completed section based on count AND the user preference
                const completedSection = document.querySelector('.completed-cards-section');
                if (completedSection) {
                    // Check user preference from localStorage (default to true if not set)
                    const showCompletedCards = localStorage.getItem('showCompletedCards') !== 'false';
                    
                    // Only show if both count > 0 AND user preference is to show
                    completedSection.style.display = (count > 0 && showCompletedCards) ? 'flex' : 'none';
                }
            }
        }
        
        // Function to update due date display on cards
        function updateDueDateDisplay(card, date) {
            // Remove any existing due date display
            const existingDisplay = card.querySelector('.due-date-display');
            if (existingDisplay) {
                existingDisplay.remove();
            }
            
            // Create new due date display
            const displayElement = document.createElement('div');
            displayElement.className = 'due-date-display';
            
            // Determine status (overdue, today, upcoming)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(date);
            dueDate.setHours(0, 0, 0, 0);
            
            const timeDiff = dueDate.getTime() - today.getTime();
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
            
            let statusClass = 'upcoming';
            let statusText = '';
            
            if (daysDiff < 0) {
                statusClass = 'overdue';
                statusText = 'OVERDUE: ';
            } else if (daysDiff === 0) {
                statusClass = 'today';
                statusText = 'DUE TODAY: ';
            }
            
            displayElement.classList.add(statusClass);
            
            // Format the date
            const options = { month: 'short', day: 'numeric' };
            if (dueDate.getFullYear() !== today.getFullYear()) {
                options.year = 'numeric';
            }
            
            const dateStr = dueDate.toLocaleDateString('en-US', options);
            
            displayElement.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                ${statusText}${dateStr}
            `;
            
            // Add to card
            const cardTitle = card.querySelector('.card-title');
            cardTitle.after(displayElement);
        }
        
        // Initialize the completed cards section
        document.addEventListener('DOMContentLoaded', () => {
            // Set up toggle for the completed cards section
            const collapseButton = document.querySelector('.collapse-completed-section');
            const completedContainer = document.querySelector('.completed-cards-container');
            
            if (collapseButton && completedContainer) {
                collapseButton.addEventListener('click', () => {
                    // Toggle collapsed state
                    completedContainer.classList.toggle('collapsed');
                    
                    // Update the button icon
                    const arrow = collapseButton.querySelector('svg polyline');
                    if (arrow) {
                        const points = completedContainer.classList.contains('collapsed') ? 
                            '6 15 12 9 18 15' : '6 9 12 15 18 9';
                        arrow.setAttribute('points', points);
                    }
                });
            }
            
            // Check for existing completed cards when loading
            updateCompletedCount();
            
            // Make the completed section draggable
            makeCompletedSectionDraggable();
        });

        // Function to make the completed cards section draggable
        function makeCompletedSectionDraggable() {
            const completedSection = document.querySelector('.completed-cards-section');
            if (!completedSection) return;
            
            let offsetX, offsetY;
            
            // Load saved position from localStorage if available
            const savedPosition = JSON.parse(localStorage.getItem('completedSectionPosition') || '{}');
            if (savedPosition.x && savedPosition.y) {
                completedSection.style.transform = `translate3d(${savedPosition.x}px, ${savedPosition.y}px, 0)`;
                completedSection.style.right = 'auto';
                completedSection.style.bottom = 'auto';
            }
            
            // Only make the header draggable to avoid interfering with card interactions
            const sectionHeader = completedSection.querySelector('.completed-section-header');
            if (!sectionHeader) return;
            
            sectionHeader.addEventListener('mousedown', function(e) {
                // Don't drag when clicking the collapse button
                if (e.target.closest('.collapse-completed-section')) {
                    return;
                }
                
                e.preventDefault();
                
                // Get current position
                const rect = completedSection.getBoundingClientRect();
                
                // Store the offset between mouse position and element corner
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                
                // Prepare for dragging
                completedSection.classList.add('dragging');
                completedSection.style.right = 'auto';
                completedSection.style.bottom = 'auto';
                
                // Set initial position
                updateSectionPosition(e);
                
                // Add document-level event listeners
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
            
            // Handle mousemove event
            function onMouseMove(e) {
                e.preventDefault();
                updateSectionPosition(e);
            }
            
            // Handle mouseup event
            function onMouseUp() {
                // Clean up listeners
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                
                completedSection.classList.remove('dragging');
                
                // Save the position to localStorage
                const transform = completedSection.style.transform;
                // Handle both translate() and translate3d() formats
                const match = transform.match(/translate(?:3d)?\(([^,]+)px,\s*([^,)]+)px(?:,\s*[^)]+)?\)/);
                if (match) {
                const position = {
                        x: match[1],
                        y: match[2]
                };
                localStorage.setItem('completedSectionPosition', JSON.stringify(position));
                }
            }
            
            // Update the section position based on mouse position (ultra-optimized)
            function updateSectionPosition(e) {
                // Use translate3d for hardware acceleration
                const x = e.clientX - offsetX;
                const y = e.clientY - offsetY;
                completedSection.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                completedSection.style.left = '';
                completedSection.style.top = '';
            }
            
            // Add touch support for mobile devices
            sectionHeader.addEventListener('touchstart', function(e) {
                if (e.target.closest('.collapse-completed-section')) {
                    return;
                }
                
                const touch = e.touches[0];
                const rect = completedSection.getBoundingClientRect();
                
                offsetX = touch.clientX - rect.left;
                offsetY = touch.clientY - rect.top;
                
                completedSection.classList.add('dragging');
                completedSection.style.right = 'auto';
                completedSection.style.bottom = 'auto';
                
                document.addEventListener('touchmove', onTouchMove, { passive: false });
                document.addEventListener('touchend', onTouchEnd);
            });
            
            function onTouchMove(e) {
                e.preventDefault();
                const touch = e.touches[0];
                
                // Use translate3d for hardware acceleration on touch devices
                const x = touch.clientX - offsetX;
                const y = touch.clientY - offsetY;
                completedSection.style.transform = `translate3d(${x}px, ${y}px, 0)`;
            }
            
            function onTouchEnd() {
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
                
                completedSection.classList.remove('dragging');
                
                // Save the position to localStorage
                const transform = completedSection.style.transform;
                // Handle both translate() and translate3d() formats
                const match = transform.match(/translate(?:3d)?\(([^,]+)px,\s*([^,)]+)px(?:,\s*[^)]+)?\)/);
                if (match) {
                const position = {
                        x: match[1],
                        y: match[2]
                };
                localStorage.setItem('completedSectionPosition', JSON.stringify(position));
                }
            }
        }

        // Function to create a new card
        function createCard(text, color) {
            // Check if we've reached the limit
            const currentCardCount = document.querySelectorAll('.card').length;
            if (currentCardCount >= maxVisibleCards) {
                showNotification(`You've reached the maximum card limit of ${maxVisibleCards}!`);
                return null;
            }
            
            cardCount++;
            
            // Determine the appropriate category based on the text content
            const category = determineCategory(text);
            
            // Prepare a title - use the text if short, otherwise shorten it
            let title = text;
            if (text.length > 40) {
                title = text.substring(0, 37) + '...';
            }
            
            // Format current date and time
            const dateTime = formatDateTime();
            
            // Get color index for the current color
            const colorIndex = cardColors.indexOf(color);
            
            // Create new card element
            const card = document.createElement('div');
            card.className = `card card-type-${category.toLowerCase()}`;
            card.dataset.index = cardCount;
            card.dataset.colorIndex = colorIndex;
            card.dataset.category = category;
            card.dataset.moved = 'false';
            card.style.background = color;
            
            // Set text color based on background
            const textColor = getTextColorForBackground(color);
            card.style.color = textColor;
            
            // Check if new cards should be collapsed by default
            const collapseNewCards = localStorage.getItem('collapseNewCards') === 'true';
            
            // Prepare card content based on category
            let categoryIcon = '';
            let specialContent = '';
            let ctaText = 'Add step';
            let emptyStateText = 'Add steps to complete your task';
            
            // Category-specific customizations
            switch(category) {
                case 'Task':
                    categoryIcon = `
                        <svg class="category-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 11l3 3L22 4"></path>
                            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                        </svg>
                    `;
                    ctaText = 'Add step';
                    emptyStateText = 'Add steps to complete your task';
                    break;
                    
                case 'Reminder':
                    categoryIcon = `
                        <svg class="category-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M10 2v2"></path>
                            <path d="M6 6l-2-2"></path>
                            <path d="M14 6l2-2"></path>
                            <circle cx="10" cy="10" r="7"></circle>
                            <path d="M10 6v5l3 3"></path>
                        </svg>
                    `;
                    ctaText = 'Add date';
                    emptyStateText = 'Add important dates or times';
                    
                    // Extract date if present in text
                    const dateMatch = text.match(/\b(tomorrow|today|next week|on (mon|tues|wednes|thurs|fri|satur|sun)day|in \d+ days|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i);
                    const timeMatch = text.match(/\b(at|by) (\d{1,2})(:|\.)?(\d{2})?(am|pm)?\b/i);
                    
                    if (dateMatch || timeMatch) {
                        const reminderDate = dateMatch ? dateMatch[0] : '';
                        const reminderTime = timeMatch ? timeMatch[0] : '';
                        
                        specialContent = `
                            <div class="reminder-datetime">
                                ${reminderDate ? `<span class="reminder-date">${reminderDate}</span>` : ''}
                                ${reminderTime ? `<span class="reminder-time">${reminderTime}</span>` : ''}
                            </div>
                        `;
                    }
                    break;
                    
                case 'Note':
                    categoryIcon = `
                        <svg class="category-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                            <path d="M14 2v6h6"></path>
                            <path d="M16 13H8"></path>
                            <path d="M16 17H8"></path>
                            <path d="M10 9H8"></path>
                        </svg>
                    `;
                    ctaText = 'Add note';
                    emptyStateText = 'Capture your thoughts here';
                    break;
                    
                case 'Idea':
                    categoryIcon = `
                        <svg class="category-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2a7 7 0 0 1 7 7c0 2.5-2 4.5-3 6.5-1 2-1 3-1 4.5-2 0-4 0-6 0 0-1.5 0-2.5-1-4.5-1-2-3-4-3-6.5a7 7 0 0 1 7-7Z"></path>
                            <path d="M9 16a3 3 0 0 0 6 0"></path>
                        </svg>
                    `;
                    ctaText = 'Add point';
                    emptyStateText = 'Expand on your idea';
                    break;
                    
                case 'Meeting':
                    categoryIcon = `
                        <svg class="category-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                    `;
                    ctaText = 'Add agenda item';
                    emptyStateText = 'Add meeting agenda items or notes';
                    break;
                    
                case 'Goal':
                    categoryIcon = `
                        <svg class="category-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <circle cx="12" cy="12" r="6"></circle>
                            <circle cx="12" cy="12" r="2"></circle>
                        </svg>
                    `;
                    ctaText = 'Add milestone';
                    emptyStateText = 'Break down your goal into milestones';
                    break;
                    
                case 'Work':
                    categoryIcon = `
                        <svg class="category-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"></path>
                        </svg>
                    `;
                    ctaText = 'Add item';
                    emptyStateText = 'List work tasks or deliverables';
                    break;
                    
                case 'Travel':
                    categoryIcon = `
                        <svg class="category-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 17h18"></path>
                            <path d="m16 10-4-4-4 4"></path>
                            <path d="M12 6v9"></path>
                        </svg>
                    `;
                    ctaText = 'Add destination';
                    emptyStateText = 'Add destinations or travel items';
                    break;
                    
                default:
                    categoryIcon = '';
                    ctaText = 'Add step';
                    emptyStateText = 'Add steps to complete';
            }
            
            // Create card content
            card.innerHTML = `
                <div class="card-header">
                    <span class="card-tag">${categoryIcon}${category}</span>
                    <div class="card-header-controls">
                        <button class="card-due-date" title="Set due date">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                        </button>
                        <button class="card-priority-flag" title="Set priority">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                                <line x1="4" y1="22" x2="4" y2="15"></line>
                            </svg>
                        </button>
                        <button class="card-complete-button" title="Mark as completed">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 6L9 17l-5-5"></path>
                            </svg>
                        </button>
                        <button class="toggle-collapse">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="18 15 12 9 6 15"></polyline>
                            </svg>
                        </button>
                        <button class="delete-card">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                <h2 class="card-title" contenteditable="true">${title}</h2>
                ${specialContent}
                <div class="task-list-container">
                    <ul class="task-list"></ul>
                    <div class="empty-task-list">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        <p>${emptyStateText}</p>
                    </div>
                    <div class="scroll-indicator"></div>
                </div>
                <button class="add-step">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    ${ctaText}
                </button>
                <div class="card-footer">
                    <div class="color-picker" style="background: ${color};"></div>
                    <div class="card-timestamp">${dateTime.fullStr}</div>
                </div>
            `;
            
            // Apply collapse setting if enabled
            if (collapseNewCards) {
                card.classList.add('collapsed');
                // Update the toggle collapse button to show the collapsed state
                setTimeout(() => {
                    const toggleCollapseButton = card.querySelector('.toggle-collapse svg polyline');
                    if (toggleCollapseButton) {
                        toggleCollapseButton.setAttribute('points', '6 9 12 15 18 9');
                    }
                }, 0);
            }
            
            // Add category-specific event listeners and behavior
            if (category === 'Reminder') {
                const taskList = card.querySelector('.task-list');
                
                // If there's no explicit reminder date/time in the text, add a date picker
                if (!specialContent) {
                    setTimeout(() => {
                        // Add a default reminder date item
                        const today = new Date();
                        const tomorrow = new Date(today);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        
                        const dateStr = tomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                        
                        const newItem = document.createElement('li');
                        newItem.className = 'task-item date-item';
                        newItem.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <div class="date-text" contenteditable="true">${dateStr}</div>
                        `;
                        
                        taskList.appendChild(newItem);
                        
                        // Show the task list and hide empty state
                        const emptyState = card.querySelector('.empty-task-list');
                        if (emptyState) {
                            emptyState.style.display = 'none';
                        }
                    }, 100);
                }
            }
            
            // Add special handling for Note cards to behave more like a text area
            if (category === 'Note') {
                // Create a note area that's more text-friendly
                setTimeout(() => {
                    const taskList = card.querySelector('.task-list');
                    const noteArea = document.createElement('div');
                    noteArea.className = 'note-content';
                    noteArea.setAttribute('contenteditable', 'true');
                    noteArea.setAttribute('placeholder', 'Write your notes here...');
                    
                    // Replace task list with note area
                    taskList.parentNode.insertBefore(noteArea, taskList);
                    taskList.style.display = 'none';
                    
                    // Hide empty state
                    const emptyState = card.querySelector('.empty-task-list');
                    if (emptyState) {
                        emptyState.style.display = 'none';
                    }
                    
                    // Focus the note area
                    noteArea.focus();
                }, 100);
            }
            
            // Setup all event listeners
            setupCardEvents(card);
            
            // Add card to container
            cardsStack.appendChild(card);
            
            // Add event listener for the complete button
            const completeButton = card.querySelector('.card-complete-button');
            if (completeButton) {
                completeButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent card dragging
                    
                    // Toggle completed state
                    const isCompleted = !card.classList.contains('completed');
                    
                    if (isCompleted) {
                        // Mark as completed
                        card.classList.add('completed');
                        
                        // If the card is not already collapsed, collapse it
                        if (!card.classList.contains('collapsed')) {
                            card.classList.add('collapsed');
                            
                            // Update toggle collapse button icon
                            const toggleCollapseButton = card.querySelector('.toggle-collapse svg polyline');
                            if (toggleCollapseButton) {
                                toggleCollapseButton.setAttribute('points', '6 9 12 15 18 9');
                            }
                        }
                        
                        // Move to completed section
                        const completedContainer = document.querySelector('.completed-cards-container');
                        if (completedContainer) {
                            // Remove any positioning
                            card.dataset.moved = 'false';
                            card.style.position = '';
                            card.style.left = '';
                            card.style.top = '';
                            
                            // Move to completed section
                            completedContainer.appendChild(card);
                            
                            // Update the count
                            updateCompletedCount();
                            
                            // Update card stack positions to bring next card forward
                            reindexCards();
                            updateCardStackPositions();
                        }
                        
                        
                        showNotification('Card marked as completed!');
                    } else {
                        // Mark as incomplete
                        card.classList.remove('completed');
                        
                        // Move back to main stack
                        const cardsStack = document.querySelector('.cards-stack');
                        if (cardsStack) {
                            cardsStack.appendChild(card);
                            
                            // Update the card positions
                            reindexCards();
                            updateCardStackPositions();
                            
                            // Update the count
                            updateCompletedCount();
                        }
                        
                        showNotification('Card reopened');
                    }
                    
                    // Update the tooltip
                    completeButton.title = isCompleted ? 'Mark as incomplete' : 'Mark as completed';
                    
                    // Update the storage
                    saveCardsToStorage();
                });
            }
            
            // Position all cards (or re-organize if in organized mode)
            if (isOrganizeMode) {
                // Re-organize the layout to include the new card
                setTimeout(() => {
                    organizeCardsByCategory();
                    generateAnalytics();
                }, 100);
            } else {
                updateCardStackPositions();
            }
            
            // Save to storage
            saveCardsToStorage();
            
            return card;
        }

        // Function to clean up any ghost cards
        function cleanupGhostCards() {
            // Remove any cards with zero opacity that aren't being animated
            const cards = document.querySelectorAll('.card');
            cards.forEach(card => {
                const opacity = parseFloat(getComputedStyle(card).opacity);
                // If the card is nearly invisible and not being interacted with
                if (opacity < 0.1 && !card.classList.contains('dragging')) {
                    card.remove();
                }
            });
            
            // Update positions and save if updateCardStackPositions is defined
            if (typeof updateCardStackPositions === 'function') {
                updateCardStackPositions();
            }
        }

        // Function to make a card draggable
        function makeDraggable(card) {
            let offsetX, offsetY;
            
            // Handle mousedown event
            card.addEventListener('mousedown', function(e) {
                // Don't drag when clicking interactive elements
                if (e.target.closest('.delete-card, .toggle-collapse, .task-checkbox, .delete-task, .add-step, .color-picker, [contenteditable="true"]')) {
                    return;
                }
                
                e.preventDefault();
                
                // Get the card's current position
                const rect = card.getBoundingClientRect();
                
                // Store the offset between mouse position and card corner
                offsetX = e.clientX - rect.left;
                offsetY = e.clientY - rect.top;
                
                // Prepare card for dragging - absolute positioning is key
                card.classList.add('positioned');
                card.classList.add('dragging');
                card.dataset.moved = 'true';
                card.style.position = 'fixed'; // Use fixed to avoid scrolling issues
                card.style.margin = '0';
                card.style.transform = 'none'; // Clear transforms
                
                // Set initial position
                updateCardPosition(e);
                
                // Add document-level event listeners
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
            
            // Handle mousemove event
            function onMouseMove(e) {
                e.preventDefault();
                updateCardPosition(e);
            }
            
            // Handle mouseup event
            function onMouseUp(e) {
                // Clean up listeners
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                
                card.classList.remove('dragging');
                
                // Make sure the card stays positioned
                card.classList.add('positioned');
                card.dataset.moved = 'true';
                
                // Save the final position
                saveCardsToStorage();
            }
            
            // Helper function to update card position during drag
            function updateCardPosition(e) {
                card.style.left = (e.clientX - offsetX) + 'px';
                card.style.top = (e.clientY - offsetY) + 'px';
            }
            
            // Add touch support
            card.addEventListener('touchstart', function(e) {
                // Don't drag when touching interactive elements
                if (e.target.closest('.delete-card, .toggle-collapse, .task-checkbox, .delete-task, .add-step, .color-picker, [contenteditable="true"]')) {
                    return;
                }
                
                e.preventDefault();
                
                const touch = e.touches[0];
                const rect = card.getBoundingClientRect();
                
                // Store the offset between touch position and card corner
                offsetX = touch.clientX - rect.left;
                offsetY = touch.clientY - rect.top;
                
                // Prepare card for dragging
                card.classList.add('positioned');
                card.classList.add('dragging');
                card.dataset.moved = 'true';
                card.style.position = 'fixed'; // Use fixed for touch too
                card.style.margin = '0';
                card.style.transform = 'none'; // Clear transforms
                
                // Set initial position
                updateTouchPosition(touch);
                
                // Add document-level touch event listeners
                document.addEventListener('touchmove', onTouchMove, { passive: false });
                document.addEventListener('touchend', onTouchEnd);
            }, { passive: false });
            
            // Handle touchmove event
            function onTouchMove(e) {
                e.preventDefault();
                updateTouchPosition(e.touches[0]);
            }
            
            // Handle touchend event
            function onTouchEnd() {
                // Clean up listeners
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
                
                card.classList.remove('dragging');
                
                // Make sure the card stays positioned
                card.classList.add('positioned');
                card.dataset.moved = 'true';
                
                // Save the final position
                saveCardsToStorage();
            }
            
            // Helper function to update card position during touch
            function updateTouchPosition(touch) {
                card.style.left = (touch.clientX - offsetX) + 'px';
                card.style.top = (touch.clientY - offsetY) + 'px';
            }
        }

        // ... existing code ...
        document.addEventListener('DOMContentLoaded', function() {
            // ... existing code ...

            // Add validation for time inputs
            const hoursInput = document.getElementById('hours');
            const minutesInput = document.getElementById('minutes');
            
            hoursInput.addEventListener('input', function() {
                const value = parseInt(this.value) || 0;
                if (value < 1) this.value = 1;
                if (value > 12) this.value = 12;
            });
            
            minutesInput.addEventListener('input', function() {
                const value = parseInt(this.value) || 0;
                if (value < 0) this.value = 0;
                if (value > 59) this.value = 59;
                
                // Always display with leading zero
                if (value < 10) {
                    this.value = this.value.padStart(2, '0');
                }
            });
            
            // Format minutes with leading zeros when blurring
            minutesInput.addEventListener('blur', function() {
                const value = parseInt(this.value) || 0;
                this.value = value.toString().padStart(2, '0');
            });
            
            // Add event listener for the date picker close button
            const closeBtn = document.getElementById('date-picker-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', function() {
                    closeDateTimePicker();
                });
            }
            
            // Add event listener for the date picker cancel button
            const cancelBtn = document.getElementById('date-picker-cancel-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', function() {
                    closeDateTimePicker();
                });
            }
            
            // ... existing code ...
        });
        
        // Initialize basic checks on page load (without requesting microphone permission)
        document.addEventListener('DOMContentLoaded', async function() {
            console.log('Initializing app...');
            
            // Check if we're on HTTPS or localhost
            const isSecure = location.protocol === 'https:' || 
                           location.hostname === 'localhost' || 
                           location.hostname === '127.0.0.1';
            
            if (!isSecure) {
                console.warn('Not on secure connection - speech recognition may not work');
            }
            
            // Check if speech recognition is supported
            const speechSupported = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
            
            if (!speechSupported) {
                console.warn('Speech recognition not supported in this browser');
            }
            
            console.log('App initialization complete');
        });
