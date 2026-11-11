zip:
	zip -r site.zip src

tag:
	git tag -a v$(VERSION)
	git push origin main

deploy: zip tag
	gh release create v$(VERSION) --notes-from-tag
	gh release upload v$(VERSION) site.zip