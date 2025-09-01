# Node - Advanced Task Management Web App

A beautiful, feature-rich task management application built with vanilla HTML, CSS, and JavaScript. No frameworks, no dependencies - pure, clean code.

## ✨ Features

### 🎯 Core Functionality
- **Smart Task Creation** - Intelligent categorization (Task, Project, Note, Reminder)
- **Dynamic Card Management** - Create, edit, delete, and organize cards
- **Visual Task Stacking** - Beautiful card stacking with rotation effects
- **Drag & Drop** - Intuitive card positioning anywhere on screen
- **Completion Tracking** - Mark tasks complete with visual feedback

### 🎨 Advanced UI
- **Organize Mode** - Group cards by category with analytics
- **Search & Filter** - Real-time search with category and date filters
- **Voice Input** - Speech-to-text card creation
- **Dynamic Colors** - 26-color palette with typing speed visualization
- **Responsive Design** - Works on all screen sizes

### 🔧 Smart Features
- **Auto-categorization** - AI-like text analysis for smart categories
- **Analytics Dashboard** - Completion rates and category breakdowns
- **Collapsible Sections** - Clean, organized interface
- **Local Storage** - Automatic data persistence
- **Theme Support** - Light/dark mode toggle

## 🚀 Getting Started

### Prerequisites
- Any modern web browser
- Python 3 (recommended) or any web server

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Unwindmeinstead/Node.git
cd Node
```

2. Start the application:
```bash
# Using npm (recommended)
npm start

# Or using Python directly
python3 -m http.server 8080

# Or using Node.js
npx http-server -p 8080
```

3. Open your browser and navigate to:
```
http://localhost:8080
```

## 📁 Project Structure

```
Node/
├── assets/
│   └── icons/          # Application icons and assets
├── css/
│   ├── styles.css      # Main application styles
│   └── voice.css       # Voice input specific styles
├── js/
│   ├── app.js          # Core application logic
│   ├── voice.js        # Speech recognition functionality
│   ├── flag_priority.js # Priority system
│   ├── makeDraggable.js # Drag & drop mechanics
│   └── color_toggle.js # Theme management
├── index.html          # Main application file
├── package.json        # Project configuration
└── README.md          # This file
```

## 🎮 Usage Guide

### Creating Tasks
1. **Type Method** - Click the input bar and type your task
2. **Voice Method** - Click the microphone icon and speak
3. **Auto-categorization** - Tasks are automatically categorized based on content

### Organization
- **Default View** - Cards stack with beautiful rotation effects
- **Organize Mode** - Click organize button for category grouping
- **Search** - Use search button for filtering and finding cards
- **Analytics** - View completion stats and category breakdowns

### Interaction
- **Drag Cards** - Click and drag to position anywhere
- **Edit Content** - Click on card titles or add tasks within cards
- **Mark Complete** - Use checkboxes to track completion
- **Priority Flags** - Set task importance levels

## 🛠️ Technical Details

### Performance Optimizations
- **Hardware Acceleration** - CSS transforms for smooth animations
- **Efficient DOM Updates** - Minimal reflow and repaint operations
- **Memory Management** - Proper event listener cleanup
- **Local Storage** - Optimized data serialization

### Browser Compatibility
- **Modern Browsers** - Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Required Features**:
  - ES6 JavaScript support
  - CSS Grid and Flexbox
  - Local Storage API
  - Web Speech API (for voice features)

### Code Quality
- **No Dependencies** - Pure vanilla JavaScript
- **Modular Architecture** - Clean separation of concerns
- **Error Handling** - Comprehensive error management
- **Performance Focused** - Optimized for speed and responsiveness

## 🎨 Customization

The application supports extensive customization:
- **Colors** - 26-color dynamic palette
- **Themes** - Light and dark mode support
- **Layout** - Flexible card positioning
- **Categories** - Customizable task categorization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🏆 Credits

Built with passion for clean, efficient code and beautiful user experiences.

---

**Node** - Where task management meets engineering excellence.