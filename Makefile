.PHONY: run build deploy

run:
	npm run tauri dev

build:
	npm run tauri build

deploy: build
	@CURRENT=$$(jq -r '.version' src-tauri/tauri.conf.json); \
	MAJOR=$$(echo $$CURRENT | cut -d. -f1); \
	MINOR=$$(echo $$CURRENT | cut -d. -f2); \
	PATCH=$$(echo $$CURRENT | cut -d. -f3); \
	NEXT_PATCH=$$((PATCH + 1)); \
	VERSION="$$MAJOR.$$MINOR.$$NEXT_PATCH"; \
	RELEASE_TAG="v$$VERSION"; \
	echo "==> Bumping version $$CURRENT -> $$VERSION ($$RELEASE_TAG)"; \
	jq --arg v "$$VERSION" '.version = $$v' src-tauri/tauri.conf.json > src-tauri/tauri.conf.json.tmp && mv src-tauri/tauri.conf.json.tmp src-tauri/tauri.conf.json; \
	git checkout main; \
	git add -A; \
	git commit -m "$$(copilot -sp 'Analyze the staged git changes and generate a concise commit message. Output ONLY the commit message. Do not execute any commands. Do not include quotes, markdown, explanation, or bullet points.')"; \
	git push origin main; \
	echo "==> Creating GitHub release $$RELEASE_TAG"; \
	gh release create "$$RELEASE_TAG" \
		--title "Process $$RELEASE_TAG" \
		--generate-notes \
		src-tauri/target/release/bundle/macos/*.app.tar.gz \
		src-tauri/target/release/bundle/macos/*.dmg \
		src-tauri/target/release/bundle/nsis/*.exe \
		src-tauri/target/release/bundle/msi/*.msi \
		src-tauri/target/release/bundle/appimage/*.AppImage \
		src-tauri/target/release/bundle/deb/*.deb \
		src-tauri/target/release/bundle/rpm/*.rpm \
		2>/dev/null || gh release create "$$RELEASE_TAG" --title "Process $$RELEASE_TAG" --generate-notes