zip:
	zip -r site-v`cat version`.zip src

tag:
	git tag -a v`cat version` -m "`git log --format=%B -n 1`"
	git push origin main

deploy: zip tag
	gh release create v`cat version` --notes-from-tag
	gh release upload v`cat version` site-v`cat version`.zip