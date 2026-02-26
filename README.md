# Network Process

**Network Process** is an ultra-minimal, high-performance desktop application built with Rust and Tauri. It focuses exclusively on monitoring and managing system processes that have active network port listeners.

## Features

- **Port-Only Filtering**: Automatically filters out system noise to show only processes with active network connections (ideal for tracking local servers like Node.js, Python, or Nginx).
- **One-Click Termination**: Instantly kill any process directly from the dashboard.
- **Ultra-Minimal UI**: A data-dense, full-screen design with zero margins and distraction-free aesthetics.
- **Real-Time Updates**: Automatically refreshes the process list every 5 seconds.
- **Cross-Platform Support**: Build and run on macOS, Linux, and Windows.

## Tech Stack

- **Backend**: [Rust](https://www.rust-lang.org/) & [Tauri v2](https://tauri.app/)
- **Frontend**: Vanilla JavaScript & CSS (Glassmorphism design system)
- **Monitoring**: `sysinfo` (Rust) & `lsof` (macOS/Unix)

## Getting Started

### Development
1. Install [Rust](https://www.rust-lang.org/tools/install) and [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites).
2. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
3. Run the application in development mode:
   ```bash
   npm run tauri dev
   ```

### CI/CD Pipeline
Builds are automated via GitHub Actions for all major platforms. Check the `.github/workflows/build.yml` file for details on cross-platform compilation.

## License
MIT
