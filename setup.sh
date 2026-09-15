#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "==================================================="
echo "           ZaloHub - Easy Installer"
echo "==================================================="
echo ""

# Check/install Bun
if ! command -v bun &>/dev/null; then
    echo "[!] Bun not found. Installing..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

echo "[+] Bun ready: $(bun --version)"
echo ""

# Install deps
if [ ! -d "node_modules" ]; then
    echo "[*] Installing dependencies..."
    bun install
fi

# Create .env if missing
if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    echo "[+] Created .env from .env.example"
fi

show_menu() {
    echo ""
    echo "==================================================="
    echo "           ZaloHub Management Menu"
    echo "==================================================="
    echo "  1. Login Zalo Personal (QR Scan)"
    echo "  2. Start Bot (Dev Mode - Hot Reload)"
    echo "  3. Start Bot (Production)"
    echo "  4. Update Dependencies"
    echo "  5. Exit"
    echo "==================================================="
    read -rp "Choose (1-5): " choice

    case "$choice" in
        1) echo "[*] Generating QR..."; bun run login:personal; show_menu ;;
        2) echo "[*] Starting Dev..."; bun run dev; show_menu ;;
        3) echo "[*] Building & running..."; bun run build && bun run start:prod; show_menu ;;
        4) echo "[*] Updating..."; bun install; echo "[+] Done!"; show_menu ;;
        5) exit 0 ;;
        *) echo "Invalid choice"; show_menu ;;
    esac
}

show_menu
