zip:
	zip -r site-v`cat version`.zip src

tag:
	git tag -a v`cat version` -m "`git log --format=%B -n 1`"
	git push origin main

sync:
	ssh happynas "mkdir -p /volume3/Objects/www/sites/teachers-pet"
	scp -r src/* happynas:/Objects/www/sites/teachers-pet

deploy: zip tag sync
	gh release create v`cat version` --notes-from-tag
	gh release upload v`cat version` site-v`cat version`.zip