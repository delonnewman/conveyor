UGLIFY_BIN=node_modules/uglify-js/bin/uglifyjs
NODE_BIN=/usr/local/bin/node
JASMINE_BIN=node_modules/jasmine/bin/jasmine.js

.PHONY: docs clean deps test publish all release

all: docs conveyor.min.js

conveyor.min.js:
	$(UGLIFY_BIN) conveyor.js > conveyor.min.js

test:
	$(NODE_BIN) $(JASMINE_BIN)

publish:
	npm publish --access=public

release: clean all publish

deps: package-lock.json

package-lock.json:
	npm install

docs: docs/index.html

docs/index.html: docs/conveyor.html
	mv docs/conveyor.html docs/index.html

docs/conveyor.html: /usr/local/bin/docco
	docco conveyor.js

clean:
	rm -rf docs
	rm conveyor.min.js

/usr/local/bin/docco:
	npm install -g docco
