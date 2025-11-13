#!/bin/bash
# Script to update yt-dlp to the latest version
# Run with: bash hub/scripts/update-yt-dlp.sh

set -e

echo "🔍 Checking yt-dlp installation..."

if ! command -v yt-dlp &> /dev/null; then
    echo "❌ yt-dlp is not installed!"
    echo ""
    echo "Please install yt-dlp using one of these methods:"
    echo ""
    echo "  Option 1 - Using pip:"
    echo "    pip install -U yt-dlp"
    echo ""
    echo "  Option 2 - Using homebrew (macOS):"
    echo "    brew install yt-dlp"
    echo ""
    echo "  Option 3 - Download binary:"
    echo "    sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp"
    echo "    sudo chmod a+rx /usr/local/bin/yt-dlp"
    echo ""
    exit 1
fi

echo "✅ yt-dlp is installed"
echo ""

CURRENT_VERSION=$(yt-dlp --version)
echo "📦 Current version: $CURRENT_VERSION"
echo ""

echo "🔄 Updating yt-dlp..."
echo ""

# Try updating with homebrew first on macOS (avoids externally-managed-environment error)
if command -v brew &> /dev/null; then
    echo "Using homebrew to update..."
    brew upgrade yt-dlp 2>&1 | grep -v "already installed" || {
        # If brew upgrade fails, try brew reinstall
        echo "Trying brew reinstall..."
        brew reinstall yt-dlp
    }
# Try updating with pip
elif command -v pip &> /dev/null || command -v pip3 &> /dev/null; then
    echo "Using pip to update..."
    if command -v pip3 &> /dev/null; then
        pip3 install -U yt-dlp --user || pip3 install -U yt-dlp --break-system-packages
    else
        pip install -U yt-dlp --user || pip install -U yt-dlp --break-system-packages
    fi
# Try self-update (works if installed as binary)
else
    echo "Attempting self-update..."
    yt-dlp -U || {
        echo "⚠️  Self-update failed. Please update manually using:"
        echo "  brew install yt-dlp  (on macOS)"
        echo "  OR"
        echo "  pip install -U yt-dlp --user"
        exit 1
    }
fi

echo ""
NEW_VERSION=$(yt-dlp --version)
echo "✅ Updated to version: $NEW_VERSION"
echo ""

if [ "$CURRENT_VERSION" = "$NEW_VERSION" ]; then
    echo "ℹ️  You were already on the latest version!"
else
    echo "🎉 Successfully updated from $CURRENT_VERSION to $NEW_VERSION"
fi
