#!/bin/bash
set -e

[ ! -f /etc/ssh/ssh_host_ed25519_key ] && ssh-keygen -A

touch /var/log/auth.log
chmod 644 /var/log/auth.log

mkdir -p /home/tunneluser/.ssh
touch /home/tunneluser/.ssh/authorized_keys
chown -R tunneluser:tunneluser /home/tunneluser/.ssh
chmod 700 /home/tunneluser/.ssh
chmod 600 /home/tunneluser/.ssh/authorized_keys

/watch_keys.sh &

fail2ban-client -x start

exec /usr/sbin/sshd -D -E /var/log/auth.log
