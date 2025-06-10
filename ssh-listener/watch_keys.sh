#!/bin/bash
set -euo pipefail

WATCH_DIR="/tmp/keys"
DEST_FILE="/home/tunneluser/.ssh/authorized_keys"

mkdir -p "$(dirname "$DEST_FILE")"
touch "$DEST_FILE"

echo "Watching $WATCH_DIR for SSH pubkey changes..."

sync_keys() {
    echo "🔄 Syncing authorized_keys with contents of $WATCH_DIR"
    > "$DEST_FILE"  # Truncate file

    for file in "$WATCH_DIR"/*.pub; do
        [[ -f "$file" ]] || continue

        while IFS= read -r line; do
            [[ -z "$line" || "$line" == \#* ]] && continue
            if [[ "$line" =~ ^ssh-(rsa|ed25519|ecdsa) ]]; then
                echo "$line" >> "$DEST_FILE"
            else
                echo "⚠️ Invalid key in $file: $line"
            fi
        done < "$file"
    done

    chown tunneluser:tunneluser "$DEST_FILE"
    chmod 600 "$DEST_FILE"
    echo "✅ authorized_keys synced."
}

# Initial sync
sync_keys

inotifywait -mq -e create -e delete -e modify -e moved_to -e moved_from "$WATCH_DIR" --format '%w%f' |
while read -r changed_file; do
    if [[ "$changed_file" == *.pub ]]; then
        echo "📌 Detected change: $changed_file"
        sync_keys
    fi
done
