.PHONY: docs clean deps test

NODE_BIN=/usr/local/bin/node
JASMINE_BIN=node_modules/jasmine/bin/jasmine.js

test:
	$(NODE_BIN) $(JASMINE_BIN)

deps: package-lock.json

package-lock.json:
	npm install

docs: docs/conveyor.html

docs/conveyor.html: /usr/local/bin/docco
	docco conveyor.js

clean:
	rm -rf docs

/usr/local/bin/docco:
	npm install -g docco
