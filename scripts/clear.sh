#!/bin/bash

# Check if an username is provided as a parameter
if [ $# -ne 1 ]; then
    echo "Usage: $0 <username>"
    exit 1
fi

# Set a default username suffix if no username is provided
default_username_suffix="::user-synchronization"
username="${1:-$default_username_suffix}"

# Get the list of commit hashes with the username message
commit_hashes=$(git log --grep="$username" --format="%H")

# Check if there are any matching commits
if [ -n "$commit_hashes" ]; then
    for commit_hash in $commit_hashes; do
        # Perform a soft reset for each matching commit
        git reset --soft "$commit_hash^"
    done

    echo "Soft reset performed for commits with the username message '$username'"
    git push -f
else
    echo "No commits found with the username message '$username'"
fi
