cd i/js/modernizr-git/ && \
	npm install && \
	node lib/generate-meta.js && \
	cp dist/metadata.json ../ && \
	cd -
