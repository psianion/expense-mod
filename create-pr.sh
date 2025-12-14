#!/bin/bash
# PR Creation Workflow Script

set -e  # Exit on any error

echo "🔍 Checking git status..."
git status --porcelain
if [ -z "$(git status --porcelain)" ]; then
    echo "❌ No changes to commit. Exiting."
    exit 1
fi

echo "📝 Enter branch name (feature/ or fix/):"
read branch_name

echo "💾 Stashing changes..."
git stash -u

echo "🔄 Switching to master and pulling..."
git checkout master
git pull origin master

echo "🌿 Creating new branch: $branch_name"
git checkout -b "$branch_name"

echo "📂 Applying stashed changes..."
git stash apply 0

echo "✅ Staging all changes..."
git add .

echo "✍️  Enter commit message:"
read commit_msg

echo "📝 Committing changes..."
git commit -m "$commit_msg"

echo "🚀 Pushing to remote..."
git push origin "$branch_name"

echo "🎉 Branch pushed! Now run this MCP command to create PR:"
echo ""
echo "user-github-create_pull_request("
echo "  owner: 'psianion',"
echo "  repo: 'expense-mod',"
echo "  title: '$commit_msg',"
echo "  head: '$branch_name',"
echo "  base: 'master',"
echo "  body: '## Summary\n$commit_msg\n\n## Changes\n- Implementation for $branch_name'"
echo ")"
