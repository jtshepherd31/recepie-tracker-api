#!/bin/bash

API="http://localhost:4741"
URL_PATH="/recipes"

curl "${API}${URL_PATH}" \
  --include \
  --request POST \
  --header "Content-Type: application/json" \
  --header "Authorization: Bearer ${TOKEN}" \
  --data '{
    "recipe": {
      "name": "'"${NAME}"'",
      "ingredients": "'"${INGREDIENTS}"'",
      "instructions": "'"${INSTRUCTIONS}"'",
      "calories": "'"${CALORIES}"'",
      "type": "'"${TYPE}"'",
      "cuisine": "'"${CUISINE}"'",
      "owner": "'"${OWNER}"'"
    }
  }'

echo
