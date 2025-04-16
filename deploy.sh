#!/bin/bash

git pull origin main

USERNAME="maxnificent"
WEBAPP_SUBDOMAIN="maxnificent.pythonanywhere.com"
API_TOKEN="$PYTHONANYWHERE_API_TOKEN"
WEBAPP_ID=$(curl -sS -H "Authorization: Token $API_TOKEN" https://www.pythonanywhere.com/api/v0/user/$USERNAME/web_apps/)
if [[ "$WEBAPP_ID" == *'"id":'* ]]; then
  WEBAPP_ID=$(echo "$WEBAPP_ID" | jq -r '.[] | select(.url == "'"$WEBAPP_SUBDOMAIN"'").id')
  curl -X POST -H "Authorization: Token $API_TOKEN" https://www.pythonanywhere.com/api/v0/user/$USERNAME/web_apps/$WEBAPP_ID/reload/
  echo "Web app reloaded successfully."
else
  echo "Web app not found or could not retrieve ID."
fi

echo "Deployment completed."