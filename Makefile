build:
	npm run build -- --base=/teachers-pet

zip:
	zip -r site-v`cat version`.zip dist

tag:
	COMMIT_COUNT=$$(git rev-list origin/main..main --count) && git tag -a v`cat version` -m "`git log --format=%B -n $$COMMIT_COUNT`"
	git push --follow-tags origin main

sync:
	ssh happynas "mkdir -p /volume3/Objects/www/sites/teachers-pet && rm -r /volume3/Objects/www/sites/teachers-pet/*"
	scp -r dist/* happynas:/Objects/www/sites/teachers-pet

deploy: build zip tag sync
	gh release create v`cat version` --notes-from-tag
	gh release upload v`cat version` site-v`cat version`.zip
	rm site-v`cat version`.zip