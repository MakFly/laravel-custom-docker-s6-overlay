#!/bin/sh
set -e # Exit on error

# Set the directories to fix
HTTPDUSER=$(ps axo user,comm | grep -E '[a]pache|[h]ttpd|[_]www|[w]ww-data|[n]ginx' | grep -v root | head -1 | cut -d\  -f1)
LARAVEL_PATH=$(pwd) # Or your specific app path inside the container

# Fallback if HTTPDUSER couldn't be determined (common in CLI-only containers)
if [ -z "$HTTPDUSER" ]; then
  # Attempt to find user from common Docker setups or default to a known one
  if id -u sail > /dev/null 2>&1; then
    HTTPDUSER=sail
  elif id -u www-data > /dev/null 2>&1; then
    HTTPDUSER=www-data
  elif id -u nginx > /dev/null 2>&1; then
    HTTPDUSER=nginx
  else
    echo "⚠️ Could not automatically determine web server user. You might need to set it manually."
    # You could prompt the user or use a default, e.g., www-data
    # For now, let's proceed assuming it might be handled by ACLs or is not critical
  fi
fi

echo "Script path: $(readlink -f "$0")"
echo "Laravel path: $LARAVEL_PATH"
if [ ! -z "$HTTPDUSER" ]; then
    echo "Web server user: $HTTPDUSER"
fi


# 1. Set ownership
# If HTTPDUSER is set, change ownership to it.
# This is crucial for the web server to write logs, cache, sessions, etc.
if [ ! -z "$HTTPDUSER" ]; then
    sudo chown -R "$HTTPDUSER":"$HTTPDUSER" "$LARAVEL_PATH/storage" "$LARAVEL_PATH/bootstrap/cache"
fi


# 2. Set directory permissions (e.g., 775 or 755)
# 775: Owner and group can read/write/execute, others can read/execute.
# 755: Owner can read/write/execute, group and others can read/execute.
# For Laravel, storage and bootstrap/cache often need to be writable by the group as well
# if CLI commands are run by a different user in the same group.
sudo find "$LARAVEL_PATH/storage" -type d -exec chmod 775 {} \;
sudo find "$LARAVEL_PATH/bootstrap/cache" -type d -exec chmod 775 {} \;

# 3. Set file permissions (e.g., 664 or 644)
# 664: Owner and group can read/write, others can read.
# 644: Owner can read/write, group and others can read.
sudo find "$LARAVEL_PATH/storage" -type f -exec chmod 664 {} \;
sudo find "$LARAVEL_PATH/bootstrap/cache" -type f -exec chmod 664 {} \;

# 4. (Optional but often good) Use ACLs for more robust permissions
# This gives the web server user rwx permissions on storage & bootstrap/cache
# This can sometimes be more reliable than chown/chmod alone if user contexts are tricky.
# Make sure acl package is installed in your Docker image (e.g., apt-get install acl)
if command -v setfacl >/dev/null && [ ! -z "$HTTPDUSER" ]; then
  echo "Setting ACLs for user $HTTPDUSER..."
  # -R: recursive, -m: modify, d: default (for new files/dirs)
  sudo setfacl -R -m u:"$HTTPDUSER":rwx -m d:u:"$HTTPDUSER":rwx "$LARAVEL_PATH/storage"
  sudo setfacl -R -m u:"$HTTPDUSER":rwx -m d:u:"$HTTPDUSER":rwx "$LARAVEL_PATH/bootstrap/cache"

  # Remove ACLs for others to prevent overly permissive setups if not intended
  # sudo setfacl -R -x o::--- "$LARAVEL_PATH/storage"
  # sudo setfacl -R -x o::--- "$LARAVEL_PATH/bootstrap/cache"
  # sudo setfacl -R -x d:o::--- "$LARAVEL_PATH/storage"
  # sudo setfacl -R -x d:o::--- "$LARAVEL_PATH/bootstrap/cache"

  # Make sure the current user (developer) also has rights
  # This assumes the script is run by the developer or a user who needs access
  CURRENT_USER=$(whoami)
  if [ "$CURRENT_USER" != "$HTTPDUSER" ] && [ "$CURRENT_USER" != "root" ]; then
      echo "Setting ACLs for current user $CURRENT_USER..."
      sudo setfacl -R -m u:"$CURRENT_USER":rwx -m d:u:"$CURRENT_USER":rwx "$LARAVEL_PATH/storage"
      sudo setfacl -R -m u:"$CURRENT_USER":rwx -m d:u:"$CURRENT_USER":rwx "$LARAVEL_PATH/bootstrap/cache"
  fi

else
  echo "setfacl command not found or HTTPDUSER not set. Skipping ACL setup."
  echo "Consider installing 'acl' package in your Docker container (e.g., apt-get update && apt-get install -y acl)."
fi

echo "✅ Permissions fixed for storage and bootstrap/cache."

# Afficher un résumé
echo "📊 Résumé des permissions:"
ls -la app/Http/Controllers/Api/ | head -5 