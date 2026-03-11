# Portify

[![Build Status](https://dev.azure.com/ramosisw/portify/_apis/build/status/ramosisw.portify?branchName=master)](https://dev.azure.com/ramosisw/portify/_build/latest?definitionId=7&branchName=master)

Portify is a React-based web application that allows you to effortlessly manage your Spotify playlists by exporting them to or importing them from a JSON file.

**Live Version:** [https://julioramos0.github.io/portify](https://julioramos0.github.io/portify)

## Features

- **Spotify Authentication:** Securely connect your Spotify account using OAuth.
- **Export Playlists:** Securely download your existing Spotify playlists into a local JSON file for backup.
- **Import Playlists:** Upload a formatted JSON file to seamlessly restore or create playlists in Spotify.

## Technology Stack

- **Frontend:** React (Create React App), Material-UI (v4)
- **State Management:** Redux, React-Redux, Redux-Thunk
- **Routing:** React Router
- **API Integration:** Spotify Web API

## Getting Started

### Prerequisites

- Node.js
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/JulioRamos0/portify.git
   ```
2. Navigate to the project directory:
   ```bash
   cd portify
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```

### Running Locally

To start the local development server, run:
```bash
npm start
```
The application will open in your default browser at `http://localhost:3000`.

### Building

To build the app for production to the `build` folder:
```bash
npm run build
```
