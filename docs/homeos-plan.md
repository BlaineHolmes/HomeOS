# 🏡 HomeOS Touchscreen Dashboard - Full Build Spec

## 🏆 Goal

Create a modular, touchscreen-based smart home dashboard housed in a custom oak enclosure. This device will:

- Control and monitor a generator via Modbus
    
- Display calendars from multiple accounts (Outlook, Google)
    
- Stream + playback Reolink cameras
    
- Accept hidden voice input for future AI assistant
    
- Show live metrics from local network equipment (TP-Link router)
    
- Track packages automatically from email
    
- Stream music via full Spotify player with multi-user login
    
- Display real-time energy usage from Emporia Energy panel
    
- Run on a mini PC (GMKtec N150) with local backend/frontend stack
    
- Feature a clean, stealthy install with fans, voice mic, and auto-updates
    
- Provide visual internet health indicators and uptime tracking
    
- Serve as a shared message board for family members
    
- Display animated weather forecast and radar
    
- Feature immersive, swipe-based UI with a rotary nav dial
    
- Display daily devotionals with AI-powered theological insights from sources like R.C. Sproul, John MacArthur, and Charles Spurgeon
    
- Provide a chore board and grocery list experience styled like real-life notebook paper with fun feedback and handwritten fonts
    
- Auto-track orders from any store (Amazon, Walmart, UPS, FedEx, etc.) and show delivery progress
    
- Offer a powerful calendar with email integration, modal-based event editing, and smart suggestions
    

---

## 🎨 UI Theme & Layout Design

### 🔘 Rotary Turnstyle Navigation

A bottom dial-style menu interface that supports:

- 3D rotating nav dial (Framer Motion)
    
- The selected (active) icon is larger and centered
    
- Swipe left/right to rotate nav dial + change pages
    
- Touch/drag to spin dial interactively
    
- Haptic-style sound or animation on selection
    
- Pages rotate in sync with the dial to maintain spatial awareness
    

Will live in:

```
/client/src/components/TurnstyleNav.tsx
```

### 🌃 Light & Dark Mode Support

- Toggle available in settings
    
- Stored preference in local storage or SQLite
    
- Global Tailwind theming with `dark:` variants
    

### 🧱 Page Structure

Each page will follow this pattern:

- **Top Bar**: Title or icon, time/date
    
- **Main View**: Fullscreen widget or scrollable dashboard
    
- **Bottom Dial**: Rotary nav interface (swipe or tap to switch)
    
- **Overlay Notifications**: Toasts from camera, delivery, ping alerts
    

### 🖥️ UI Animations

- Framer Motion transitions between pages (fade, swipe, spring)
    
- Page content animates in from direction of swipe
    
- Button presses use micro-interactions for feedback
    

### 🎨 Global Dashboard Styling

- **Theme**: Modern, glassy, translucent UI with vibrant accents
    
- **Contrast**: Clear white text on dark frosted backgrounds (or vice versa)
    
- **Glassmorphism**: Consistent use of blurred containers with shadow and border
    

### 🌀 Interactive List Styling (Grocery & Chore Pages)

- Notebook paper background texture
    
- Pencil-style handwritten font (e.g., Patrick Hand or Indie Flower)
    
- **Grocery List**:
    
    - Checkboxes beside each item
        
    - Cross out item on check
        
    - Touchable header navigates to full grocery list page
        
- **Chore List**:
    
    - Star icons beside each item
        
    - Tapping star lights it up and triggers full-screen confetti animation
        
    - Confetti to encourage kid engagement
        

### 🧭 Navigation & Interaction Notes

- Swipeable carousel page transitions
    
- Dial nav spins and magnifies selected option
    
- Visual depth using scale + blur for inactive icons
    

---

## 📦 Delivery Tracker Module

### 📬 Auto-Populated Package Tracker

- Monitors multiple email accounts (e.g., Jake + Wife)
    
- Extracts tracking info from shipping confirmation emails
    
- Adds package to dashboard without user input
    

### 📊 Card Display Format (On Main Dashboard)

```
Amazon      USPS     9400 1234 5678 9123 4567     📦──────────────▶🏠
```

- **Vendor**: Extracted from email (Amazon, Walmart, UPS, etc.)
    
- **Courier**: USPS, FedEx, UPS, Amazon Logistics
    
- **Tracking Number**: Full or shortened version
    
- **Progress Bar**: Visual representation of delivery status
    
- **Icons**: 📦 = shipped, 🏠 = delivered (color changes on delivery)
    

### 📋 Modal on Tap

Tapping the package row opens a modal with:

- Full item breakdown (from email body)
    
- Estimated delivery date
    
- Link to tracking if needed
    
- Order status history
    

### 🔧 Backend Logic

```
/server/delivery/emailParser.ts        ← monitors inbox for confirmations
/server/delivery/tracker.ts            ← tracks updates via courier APIs
```

- Uses IMAP to access Gmail/Outlook mailboxes
    
- Uses tracking APIs like EasyPost or 17track or native scraping
    
- Normalizes data and feeds into dashboard
    

### 🤠 Smart Features

- Groups packages by vendor or estimated delivery day
    
- Auto-clears delivered packages after configurable period
    
- Highlights anything marked "Out for Delivery" or "Delayed"
    
- Future AI assistant can respond to: “Where’s my Amazon order?”
    

---

## ⚡ Generator Page Layout

Inspired by the DC92D Mebay panel:

### 📋 Metrics Displayed

- Output Voltage (Line-to-Line or L-N)
    
- Frequency (Hz)
    
- Engine Oil Temperature
    
- Coolant Temperature
    
- RPM
    
- Oil Pressure
    
- Mains Voltage (L-L or L-N)
    

Each metric will display a live digital readout and a colored indicator dot.

### 🔴 Status Dots

|State|Description|
|---|---|
|🔴 Red|Fault or error|
|🟡 Yellow|Cooldown/Not ready|
|🟢 Green|Normal or Ready state|

Indicators:

- Running
    
- Loaded
    
- Cooldown
    
- Ready
    
- Mains
    

### 🧰 Generator Control Buttons

Buttons will have distinct styles and possibly safety confirmation modals:

- Manual Start
    
- Stop
    
- Auto
    
- Transfer
    
- Test-on-load
    

### 🔧 Backend

All data and controls handled via:

```
/server/modbus/generator.ts
```

Uses Modbus RTU or TCP, polling at 1s intervals.

### 🎛️ UI Layout

- **Top**: Generator name + status summary
    
- **Middle Grid**: Metric readouts with LED-style dot indicators
    
- **Bottom**: Control buttons in row with color-coded styles
    
- **Sidebar or Overlay**: Emergency stop, logs, settings
    

---

## 📅 Calendar Page Layout

### 🖖 Layout Style

- Month view (default) with toggle for Week / Day views
    
- Time block day view for schedule-style planning
    
- Sidebar mini-calendar for fast navigation
    
- Swipe gestures to move between months/weeks
    
- Color-coded events for each category
    

### ➕ Event Modal Fields

|Field|Description|
|---|---|
|Title|Event name|
|Date & Time|Start + end time pickers, all-day toggle|
|Location|Text + map preview (optional maps integration)|
|Color/Label|Categories: Personal, Work, School, etc.|
|Reminders|5 min, 15 min, 1 hr, 1 day|
|Recurrence|Daily, Weekly, Monthly, Custom|
|Notes|Markdown-style longform note|
|Attachments|Upload PDFs/images/etc.|
|Voice Note|Optional mic-recorded memo (future)|
|Priority Flag|Mark as high importance|
|Private Toggle|Hide details from shared views|
|Auto-Sync Toggle|Allow sync with external or keep local-only|

### 📨 Smart Calendar Features

- Syncs with email account configured in Settings
    
- Auto-add events from email (e.g. "Dentist Tues 10am")
    
- Linked with message board + grocery list
    
- Future AI assist for expanding short phrases into full events
    
- Multiple view modes: Month, Week, Day, Time Block
    

---

## 📌 Main Dashboard Widgets

- 🌅 **Sunrise/Sunset Clock** with local time zone
    
- 🕰️ Time and date at top center
    
- ✅ Daily To-Do’s & Chores for Kids (from Chore List)
    
- 🛒 Running Grocery List (interactive with voice add)
    
- 📦 Recent Deliveries (up to 3 on screen)
    
- 💡 Power Usage (live feed from Emporia)
    
- 🌤️ Weather Widget (7-day forecast + radar animation)
    
- 📖 Daily Devotional + Verse (tap for commentary)
    

---

## ✏️ Chore & Grocery Pages

### Grocery List Page

- Notebook paper style background
    
- Handwritten font (Patrick Hand)
    
- Checkbox removes item with line-through
    
- Header acts as nav to full page list
    
- Mic button adds via voice
    

### Chore List Page

- Same notebook/pencil theme
    
- Star next to each chore
    
- Star glows + triggers full-screen confetti
    
- Simple and fun for kids to interact with
    

### Daily Tasks & Chores by Day

**Task List**

- Monday: Piano, Typing, Math
    
- Tuesday: English, Science, History
    
- Wednesday: Piano, Typing, Math, Take Trash to Road
    
- Thursday: English, Science
    
- Friday: Piano, Typing, Math
    

**Chores by Day**

- Every Day: Clean Room
    
- Monday: Vacuum
    
- Wednesday: Take All Trash Out, Bring Trashcan to Road
    
- Friday: Vacuum
    

### 🧾 Add Chore Modal Dropdown List

- Clean Room
    
- Vacuum
    
- Take Trash Out
    
- Bring Trashcan to Road
    
- Sweep Kitchen
    
- Wash Dishes
    
- Fold Laundry
    
- Feed Pets
    
- Make Bed
    
- Water Plants
    
- Pick Up Toys
    
- Wipe Down Counters
    

---

## 🎵 Spotify Player Page

- Profile selector (horizontal swiper)
    
- Album art, controls, volume, queue view
    
- Multi-user support
    
- Login modal on first use
    
- Playback device picker
    

---

## ⚙️ Settings Page

- Theme toggle (light/dark, contrast, font size)
    
- Voice assistant config (wake word, mic)
    
- Email & calendar account management
    
- Generator Modbus config
    
- WiFi/Ethernet info
    
- Auto-update toggle
    
- Dev tools + reboot
    

---

## ✅ Other Features to Add Next

- Internet Health Monitor (ping, uptime)
    
- Family Message Board
    
- Network Device Metrics (from router)
    
- Devotional Explanation via R.C. Sproul, MacArthur, Spurgeon
    
- Hidden Mic Flush-Mounted in wood housing
    
- Smart Assistant integrations for reminders & automation