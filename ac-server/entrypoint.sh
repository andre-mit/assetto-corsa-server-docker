#!/bin/bash
set -e

AC_DIR="/home/steam/ac-server"
DEFAULTS_DIR="/home/steam/ac-defaults/cfg"

# --- Initialize config volume on first run ---
# If the cfg directory inside the volume is empty, copy the defaults from the image
if [ ! -f "${AC_DIR}/cfg/server_cfg.ini" ]; then
  echo "[entrypoint] Config files not found. Initializing from defaults..."
  mkdir -p "${AC_DIR}/cfg"
  cp -r "${DEFAULTS_DIR}/." "${AC_DIR}/cfg/"
  echo "[entrypoint] Config initialized:"
  ls "${AC_DIR}/cfg/"
else
  echo "[entrypoint] Config files already present. Skipping default copy."
fi

# --- Install acServer via SteamCMD if not already installed ---
if [ ! -f "${AC_DIR}/acServer" ]; then
  echo "[entrypoint] acServer not found. Installing via SteamCMD..."

  if [ -z "${STEAM_USER}" ] || [ -z "${STEAM_PASSWORD}" ]; then
    echo "[entrypoint] ERROR: STEAM_USER and STEAM_PASSWORD environment variables must be set."
    exit 1
  fi

  /home/steam/steamcmd/steamcmd.sh \
    +force_install_dir "${AC_DIR}" \
    +login "${STEAM_USER}" "${STEAM_PASSWORD}" \
    +app_update 302550 \
    +quit

  echo "[entrypoint] Installation complete."
else
  echo "[entrypoint] acServer already installed. Skipping SteamCMD."
fi

# acServer uses relative paths — must run from its own directory
cd "${AC_DIR}"

echo "[entrypoint] Listing files in /home/steam/ac-server:"
ls -lh /home/steam/ac-server

echo "[entrypoint] Listing files in /home/steam:"
ls -lh /home/steam

echo "[entrypoint] Starting acServer from $(pwd)..."
exec ./acServer "$@"
