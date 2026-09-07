(() => {
    "use strict";

    const cfg = window.CloudSaveConfig || {};
    const SAVE_URL = (cfg.apiBase || "") + "/api/save";
    const SAVE_DEBOUNCE_MS = 800;
    const UPLOAD_THROTTLE_MS = 2500;

    function bytesToBase64(binStr) {
        let binary = "";
        for (let i = 0; i < binStr.length; i++) {
            binary += String.fromCharCode(binStr.charCodeAt(i) & 0xff);
        }
        return btoa(binary);
    }

    function base64ToBytes(b64) {
        const binary = atob(b64);
        let out = "";
        for (let i = 0; i < binary.length; i++) {
            out += String.fromCharCode(binary.charCodeAt(i) & 0xff);
        }
        return out;
    }

    const CloudSave = {
        map: {},
        loaded: false,
        ready: null,
        dirty: false,
        saveTimer: null,
        lastUpload: 0,
        _patchTries: 0,

        init() {
            console.log("[CloudSave] init user:", cfg.username);
            this.ready = this.loadAll();
            this.patchStorage();
            this.hookBeforeUnload();
        },

        async loadAll() {
            try {
                const r = await fetch(SAVE_URL, { method: "GET", credentials: "include" });
                const j = r.ok ? await r.json() : null;
                this.map = (j && j.data) || {};
            } catch (e) {
                console.warn("[CloudSave] load error", e);
                this.map = {};
            }
            this.loaded = true;
        },

        scheduleUpload() {
            this.dirty = true;
            if (this.saveTimer) clearTimeout(this.saveTimer);
            this.saveTimer = setTimeout(() => this.uploadNow(), SAVE_DEBOUNCE_MS);
        },

        async uploadNow() {
            if (!this.dirty) return;
            this.dirty = false;
            const now = Date.now();
            const wait = UPLOAD_THROTTLE_MS - (now - this.lastUpload);
            if (wait > 0) await new Promise((res) => setTimeout(res, wait));
            this.lastUpload = Date.now();
            try {
                const r = await fetch(SAVE_URL, {
                    method: "PUT",
                    credentials: "include",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ data: this.map }),
                });
                const j = await r.json().catch(() => ({}));
                if (!j.ok) {
                    console.warn("[CloudSave] upload rejected", r.status);
                    this.dirty = true;
                }
            } catch (e) {
                console.warn("[CloudSave] upload error", e);
                this.dirty = true;
            }
        },

        flushSync() {
            const xhr = new XMLHttpRequest();
            xhr.open("PUT", SAVE_URL, false);
            xhr.setRequestHeader("content-type", "application/json");
            try {
                xhr.send(JSON.stringify({ data: this.map }));
            } catch (e) {}
        },

        set(saveName, zipBinary) {
            this.map[saveName] = bytesToBase64(zipBinary);
            this.scheduleUpload();
        },

        get(saveName) {
            const b64 = this.map[saveName];
            return b64 ? base64ToBytes(b64) : null;
        },

        has(saveName) {
            return Object.prototype.hasOwnProperty.call(this.map, saveName);
        },

        remove(saveName) {
            delete this.map[saveName];
            this.scheduleUpload();
        },

        keys() {
            return Object.keys(this.map);
        },

        hookBeforeUnload() {
            window.addEventListener("beforeunload", () => {
                if (this.dirty) this.flushSync();
            });
        },

        patchStorage() {
            const SM = window.StorageManager;
            if (!SM) {
                if (++this._patchTries > 200) return;
                setTimeout(() => this.patchStorage(), 50);
                return;
            }
            SM.isLocalMode = function () { return false; };
            SM.saveToForage = (saveName, zip) => {
                CloudSave.set(saveName, zip);
                return Promise.resolve();
            };
            SM.loadFromForage = (saveName) => {
                return CloudSave.ready.then(() => CloudSave.get(saveName));
            };
            SM.forageExists = (saveName) => {
                return CloudSave.loaded
                    ? CloudSave.has(saveName)
                    : Object.prototype.hasOwnProperty.call(CloudSave.map, saveName);
            };
            SM.removeForage = (saveName) => {
                CloudSave.remove(saveName);
                return Promise.resolve();
            };
            SM.updateForageKeys = () => {
                return Promise.resolve().then(() => {
                    CloudSave._forageKeys = CloudSave.keys();
                    return 0;
                });
            };
            SM.forageKeysUpdated = () => true;
            console.log("[CloudSave] StorageManager patched, slug:", SLUG);
        },
    };

    CloudSave.init();
    window.CloudSave = CloudSave;
})();