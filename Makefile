.PHONY: run build deploy

run:
	npm run tauri dev

build-mac:
	npm i
	rm -rf src-tauri/target/release/bundle/dmg src-tauri/target/release/bundle/macos
	npm run tauri build
	@mkdir -p build
	@cp -R src-tauri/target/release/bundle/macos/* build/ 2>/dev/null || true
	@cp -R src-tauri/target/release/bundle/dmg/* build/ 2>/dev/null || true

WIN_BUILD_CMDS := ['powershell -Command if (Test-Path src-tauri/target) { Remove-Item -Recurse -Force src-tauri/target }', 'npm i', 'npm run tauri build']
WIN_FETCH := ['src-tauri/target/release/bundle/msi/', 'build', 'src-tauri/target/release/bundle/nsis/', 'build']

build-windows:
	zsh -ic "devbuild rust windows \"$(WIN_BUILD_CMDS)\""
	zsh -ic "devbuild rust windows --fetch \"$(WIN_FETCH)\""

LINUX_BUILD_CMDS := ['npm i', 'rm -rf build src-tauri/target' ,'npm run tauri build']
LINUX_FETCH := ['src-tauri/target/release/bundle/deb/', 'build', 'src-tauri/target/release/bundle/rpm/', 'build', 'src-tauri/target/release/bundle/appimage/', 'build']

build-linux:
	zsh -ic "devbuild rust linux \"$(LINUX_BUILD_CMDS)\""
	zsh -ic "devbuild rust linux --fetch \"$(LINUX_FETCH)\""

build:
	@echo "Which platforms would you like to build? (mac, linux, win — space-separated, any combination):"
	@read targets; \
	for t in $$targets; do \
		case "$$t" in \
			mac) $(MAKE) build-mac ;; \
			linux) $(MAKE) build-linux ;; \
			win|windows) $(MAKE) build-windows ;; \
			*) echo "Invalid option: $$t. Choose mac, linux, or win."; exit 1 ;; \
		esac; \
	done


CUR_VERSION := $(shell jq -r '.version' src-tauri/tauri.conf.json)
VERSION_PARTS := $(subst ., ,$(CUR_VERSION))
MAJOR := $(word 1,$(VERSION_PARTS))
MINOR := $(word 2,$(VERSION_PARTS))
PATCH := $(word 3,$(VERSION_PARTS))
NEXT_PATCH := $(shell echo $$(( $(PATCH) + 1 )))
NEXT_VERSION := $(MAJOR).$(MINOR).$(NEXT_PATCH)
RELEASE_TAG := v$(NEXT_VERSION)

deploy:
	rm -rf build
	mkdir -p build
	@echo "==> 1. Bumping version $(CUR_VERSION) -> $(NEXT_VERSION) ($(RELEASE_TAG))"
	@jq --arg v "$(NEXT_VERSION)" '.version = $$v' src-tauri/tauri.conf.json > src-tauri/tauri.conf.json.tmp && mv src-tauri/tauri.conf.json.tmp src-tauri/tauri.conf.json
	@echo "==> 2-3. Building (choose platform)"
	@$(MAKE) build
	@echo "==> 4. Aggregating release assets from build/"
	@rm -rf release-assets && mkdir release-assets
	@find build -type f \( -name '*.app.tar.gz' -o -name '*.dmg' -o -name '*.exe' -o -name '*.msi' -o -name '*.AppImage' -o -name '*.deb' -o -name '*.rpm' \) -exec cp {} release-assets/ \;
	@echo "    Aggregated assets:"; @ls -1 release-assets/ | sed 's/^/      /'
	@echo "==> 5. Committing and creating GitHub release $(RELEASE_TAG)"
	@git checkout main
	@git add -A
	@git commit -m "$$(copilot -sp 'Analyze the staged git changes and generate a concise commit message. Output ONLY the commit message. Do not execute any commands. Do not include quotes, markdown, explanation, or bullet points.')"
	@git push origin main
	@gh release create "$(RELEASE_TAG)" \
		--title "Process $(RELEASE_TAG)" \
		--generate-notes \
		release-assets/* \
		2>/dev/null || gh release create "$(RELEASE_TAG)" --title "Process $(RELEASE_TAG)" --generate-notes
	@rm -rf release-assets