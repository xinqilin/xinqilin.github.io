# build public/
hugo -t anatole


commit_message="$1"
# push public website
cd public/
git add . -A
git commit -m "$commit_message"
git push
cd ..

# push github backup
git add . -A
git commit -m "$commit_message"
git push