# High-Level Overview

A non-technical guide to understanding this application's architecture and purpose.

---

## What Is This Application?

Imagine a secure office building with multiple departments inside. This application works the same way:

- **One main entrance** (with a security guard who checks your ID)
- **Multiple departments** inside (each handling different tasks)
- **Shared resources** (like a filing cabinet everyone can access)
- **A central directory** (that knows who works here and what they're allowed to do)

This is a **web application** — software you access through a web browser (like Chrome or Safari) that helps organizations manage data, generate reports, and store files securely.

---

## The Big Picture

```
    🌐 YOU (using a web browser)
         |
         ↓
    ┌─────────────────────────────────────────────────────────┐
    │                                                         │
    │   🏢 THE APPLICATION (like a secure office building)   │
    │                                                         │
    │   ┌─────────────┐                                       │
    │   │ 🚪 ENTRANCE │ ← Only way in (Nginx)                │
    │   │   (Lobby)   │                                       │
    │   └──────┬──────┘                                       │
    │          │                                              │
    │          ↓                                              │
    │   ┌─────────────┐     ┌─────────────┐                  │
    │   │ 🛂 SECURITY │ ←→  │ 📋 EMPLOYEE │                  │
    │   │   (Guard)   │     │  DIRECTORY  │                  │
    │   └──────┬──────┘     │ (Keycloak)  │                  │
    │          │            └─────────────┘                  │
    │          ↓                                              │
    │   ┌─────────────┐                                       │
    │   │ 🖥️ RECEPTION │ ← What you see (Frontend)           │
    │   │   (Lobby)   │                                       │
    │   └──────┬──────┘                                       │
    │          │                                              │
    │    ┌─────┴─────┬─────────────┐                         │
    │    ↓           ↓             ↓                         │
    │ ┌──────┐  ┌──────┐     ┌──────┐                        │
    │ │ 📁   │  │ 📊   │     │ 📝   │                        │
    │ │Files │  │Report│     │ Data │  ← Departments         │
    │ │ Dept │  │ Dept │     │ Dept │    (Backend Services)  │
    │ └──────┘  └──────┘     └──────┘                        │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
```

---

## The Components Explained

### 🚪 The Entrance (Nginx Proxy)

**What it is**: The single front door to the entire application.

**Real-world analogy**: Think of the main entrance to a corporate office building. Everyone must enter through this one door — there are no side entrances or back doors.

**Why it exists**:
- **Security**: All traffic goes through one controlled point
- **Encryption**: Scrambles data so no one can eavesdrop (like a sealed envelope vs. a postcard)
- **Traffic direction**: Knows where to send each visitor based on what they need

**What happens here**:
1. You arrive at the entrance
2. The entrance checks if you have a valid visitor badge (are you logged in?)
3. If yes → you're directed to the right department
4. If no → you're sent to security to get a badge first

---

### 🛂 The Security Guard (Flask OIDC Proxy)

**What it is**: The authentication checkpoint that verifies your identity.

**Real-world analogy**: The security desk in a building lobby. They don't decide if you're *allowed* in (that's the employee directory's job), but they verify that you are who you claim to be.

**Why it exists**:
- Handles the "login" process
- Creates and checks your "visitor badge" (session cookie)
- Works with the employee directory to verify identities

**What happens here**:
1. You say "I'm John Smith"
2. Security asks the employee directory: "Is John Smith a real employee?"
3. The directory confirms and tells security what John is allowed to do
4. Security gives you a badge that says "John Smith - Editor"
5. On future visits, security just checks your badge instead of asking the directory again

---

### 📋 The Employee Directory (Keycloak)

**What it is**: The central system that knows everyone who's allowed to access the application and what they can do.

**Real-world analogy**: The HR database combined with the access control system. It knows:
- Who works here (usernames and passwords)
- What department they're in (roles)
- What areas they can access (permissions)

**Why it exists**:
- **Single source of truth**: One place manages all user accounts
- **Role management**: Defines what different types of users can do
- **Security standards**: Uses industry-standard protocols (like a universal ID card system)

**The three types of users**:

| Role | What They Can Do | Real-World Equivalent |
|------|------------------|----------------------|
| **Viewer** | Look at data, but can't change anything | A visitor on a tour |
| **Editor** | View, create, and modify data | A regular employee |
| **Admin** | Everything, plus manage the system | A building manager |

---

### 🖥️ The Reception Area (Frontend)

**What it is**: The visual interface you actually see and interact with — buttons, menus, tables, forms.

**Real-world analogy**: The reception desk and lobby displays. It's the "face" of the organization — welcoming, informative, and helps you navigate to what you need.

**Why it exists**:
- **User experience**: Makes the application easy to use
- **Visual presentation**: Displays data in a readable format
- **Navigation**: Helps you move between different sections

**What you see here**:
- Dashboard with overview information
- Navigation menu to different sections
- Tables showing your data
- Buttons to perform actions (if your role allows)

---

### 📁 The File Storage Department (Blob Service)

**What it is**: Handles uploading, downloading, and organizing files.

**Real-world analogy**: The file room or document storage area. Need to store a PDF? Retrieve a spreadsheet? This department handles it.

**Why it exists**:
- **File management**: Upload, download, and delete files
- **Organization**: Files are organized into containers (like folders)
- **Scalability**: Can handle millions of files without slowing down

**What it stores**:
- Documents (PDFs, Word files)
- Images
- Exports and backups
- Any file the organization needs to keep

---

### 📊 The Reports Department (Reports Service)

**What it is**: Generates reports from your data — summaries, analytics, exports.

**Real-world analogy**: The analytics team that takes raw data and creates meaningful reports. "Show me all sales from last month" → they produce a formatted report.

**Why it exists**:
- **Data analysis**: Turns raw data into useful insights
- **Scheduled reports**: Can generate reports automatically
- **Export formats**: Creates PDFs, spreadsheets, etc.

**How it works**:
1. You request a report: "Generate monthly sales report"
2. The department starts working on it (this takes time for big reports)
3. You can check the status: "Is my report ready?"
4. When done, you can download it

---

### 📝 The Data Management Department (Data Service)

**What it is**: The core database operations — creating, reading, updating, and deleting records.

**Real-world analogy**: The main record-keeping department. They maintain the master list of everything — customers, products, transactions, etc.

**Why it exists**:
- **Data storage**: Keeps all your business data organized
- **CRUD operations**: Create, Read, Update, Delete records
- **Search**: Find specific records quickly

**What it manages**:
- Business entities (customers, products, orders)
- Metadata (categories, tags, descriptions)
- Timestamps (when things were created or modified)

---

### 🗄️ The Shared Resources

Behind the scenes, the departments share some common resources:

#### The Database (PostgreSQL)
**What it is**: Where all the actual data is permanently stored.

**Real-world analogy**: The filing cabinets and record books. When the building closes for the night, all the important information is safely stored here and will still be there tomorrow.

#### The Quick-Access Memory (Redis)
**What it is**: A super-fast temporary storage for frequently accessed data.

**Real-world analogy**: The desk of each department with the files they're currently working on. Instead of walking to the filing cabinet every time, they keep commonly used files on their desk for quick access.

**Why it exists**:
- **Speed**: Accessing data from memory is 100x faster than from the database
- **Reduced load**: The database doesn't get overwhelmed with repeated requests
- **Session storage**: Remembers who's logged in without checking the database every time

#### The Cloud Storage (Azurite / Azure Blob)
**What it is**: Where files (not database records) are stored.

**Real-world analogy**: An off-site storage warehouse. Too many files to keep in the office? They go to the warehouse, and we can retrieve them when needed.

---

## How It All Works Together

Let's walk through a real scenario: **You want to generate a sales report**

```
Step 1: You open your browser and go to the application
        ↓
        🚪 Entrance receives your request

Step 2: Entrance asks: "Do you have a valid badge?"
        ↓
        🛂 Security checks... you don't have one yet

Step 3: Security redirects you to login
        ↓
        📋 Employee Directory shows login page
        ↓
        You enter username and password

Step 4: Directory confirms: "Yes, this is Sarah, she's an Editor"
        ↓
        🛂 Security creates a badge for you
        ↓
        You're redirected back to the entrance

Step 5: Entrance sees your badge and lets you through
        ↓
        🖥️ Reception shows you the dashboard

Step 6: You click "Reports" in the menu
        ↓
        🖥️ Reception shows the reports page

Step 7: You click "Generate New Report" and fill out the form
        ↓
        📊 Reports Department receives your request
        ↓
        "Got it! Working on your Monthly Sales Report..."

Step 8: Reports Department:
        - Asks Data Department for the raw sales data
        - Processes and formats it
        - Saves the finished report to File Storage

Step 9: You refresh the page
        ↓
        "Your report is ready! Click to download"
        ↓
        📁 File Storage sends you the PDF
```

---

## Why Build It This Way?

### Separation of Concerns
Each component does ONE job well. The entrance doesn't generate reports. The reports department doesn't handle logins. This makes the system:
- **Easier to fix**: If reports are broken, we know exactly where to look
- **Easier to scale**: If file storage is overloaded, we can expand just that part
- **Easier to update**: We can improve one component without touching others

### Security in Layers
Like a building with multiple security checkpoints:
1. **Encrypted connection** (HTTPS) — No one can eavesdrop
2. **Single entrance** — No sneaking in through side doors
3. **Authentication** — Prove who you are
4. **Authorization** — Prove you're allowed to do this specific action
5. **Data validation** — Make sure requests are legitimate

### Scalability
When more people use the application:
- We can add more "security guards" to handle login traffic
- We can add more "report generators" to handle report requests
- Each component scales independently based on demand

---

## The Two Environments

### Local Development (Your Computer)
When developers are building and testing:
- Everything runs on one computer using Docker
- Uses fake/simulated versions of cloud services
- Free to run, easy to reset

### Cloud Production (Azure)
When real users access the application:
- Runs on Microsoft's Azure cloud platform
- Uses real, managed cloud services
- Scales automatically based on demand
- Costs money, but handles millions of users

Think of it like:
- **Local** = A model train set in your basement (for testing and fun)
- **Cloud** = A real railroad system (for actual transportation)

---

## Glossary of Terms

| Term | Simple Explanation |
|------|-------------------|
| **API** | A way for software components to talk to each other (like an intercom system) |
| **Authentication** | Proving who you are (showing your ID) |
| **Authorization** | Proving you're allowed to do something (having the right key card) |
| **Container** | A packaged, portable unit of software (like a shipping container for code) |
| **Database** | Organized storage for data (like a giant spreadsheet) |
| **Docker** | Technology that runs containers (the ship that carries shipping containers) |
| **Frontend** | What users see and interact with (the lobby and reception) |
| **Backend** | The behind-the-scenes processing (the departments and workers) |
| **HTTPS** | Secure, encrypted web connection (a sealed envelope vs. a postcard) |
| **Microservices** | Small, focused services that do one job each (specialized departments) |
| **Proxy** | An intermediary that handles requests (a receptionist who directs visitors) |
| **Session** | The application remembering who you are during a visit (your visitor badge) |
| **Token** | A digital proof of identity (your badge's barcode) |

---

## Summary

This application is like a well-organized, secure office building:

| Component | Building Equivalent | Purpose |
|-----------|-------------------|---------|
| Nginx Proxy | Main Entrance | Single point of entry, security |
| Flask OIDC Proxy | Security Desk | Verifies identities, issues badges |
| Keycloak | Employee Directory | Knows who's allowed and what they can do |
| Frontend | Reception/Lobby | What visitors see and interact with |
| Blob Service | File Storage Room | Manages documents and files |
| Reports Service | Analytics Team | Generates reports and insights |
| Data Service | Records Department | Manages core business data |
| PostgreSQL | Filing Cabinets | Permanent data storage |
| Redis | Desk Files | Quick-access temporary storage |

The beauty of this design is that each piece is independent but works together seamlessly — just like a well-run organization where each department knows its role and communicates effectively with others.

---

*This overview is designed to help anyone understand how modern web applications are structured, even without a technical background.*
