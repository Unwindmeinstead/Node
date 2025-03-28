// Grey color palette for cards
const greyCardColors = [
    '#333333', // Dark grey
    '#1F2937', // Dark blue-grey
    '#312E81', // Dark indigo
    '#4C1D95', // Dark purple
    '#831843', // Dark pink
    '#7F1D1D', // Dark red
    '#14532D', // Dark green
    '#065F46'  // Dark teal
];

// Colorful gradient card colors
const colorfulCardColors = [
    'linear-gradient(135deg, rgba(106, 17, 203, 0.7) 0%, rgba(37, 117, 252, 0.7) 100%)',
    'linear-gradient(135deg, rgba(255, 108, 171, 0.6) 0%, rgba(115, 102, 255, 0.6) 100%)',
    'linear-gradient(135deg, rgba(8, 174, 234, 0.6) 0%, rgba(42, 245, 152, 0.6) 100%)',
    'linear-gradient(135deg, rgba(254, 225, 64, 0.6) 0%, rgba(250, 112, 154, 0.6) 100%)',
    'linear-gradient(135deg, rgba(67, 203, 255, 0.6) 0%, rgba(151, 8, 204, 0.6) 100%)',
    'linear-gradient(135deg, rgba(102, 126, 234, 0.6) 0%, rgba(118, 75, 162, 0.6) 100%)',
    'linear-gradient(135deg, rgba(248, 54, 0, 0.6) 0%, rgba(249, 212, 35, 0.6) 100%)',
    'linear-gradient(135deg, rgba(59, 38, 103, 0.65) 0%, rgba(188, 120, 236, 0.65) 100%)'
];

// Default to grey colors
window.cardColors = greyCardColors;

// Check if colorful cards are enabled
const useColorfulCards = localStorage.getItem('useColorfulCards') === 'true';
if (useColorfulCards) {
    window.cardColors = colorfulCardColors;
} 