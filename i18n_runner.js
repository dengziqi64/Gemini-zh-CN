(function () {

    var data = window.__ANTIGRAVITY_I18N_DATA__ || {};

    var EXACT = data.exact || {};

    var REVERSE_MAP = data.reverse_map || {};

    var REGEX_RULES = [];

    if (Array.isArray(data.regex_rules)) {

        for (var i = 0; i < data.regex_rules.length; i++) {

            try {

                REGEX_RULES.push({

                    re: new RegExp(data.regex_rules[i].pattern),

                    rep: data.regex_rules[i].replacement

                });

            } catch (e) {}

        }

    }

    var EXEMPTIONS = data.exemptions || [];



    // Always update global store on new data injection

    window.__ANTIGRAVITY_EXACT__ = Object.assign(window.__ANTIGRAVITY_EXACT__ || {}, EXACT);

    window.__ANTIGRAVITY_REVERSE_MAP__ = Object.assign(window.__ANTIGRAVITY_REVERSE_MAP__ || {}, REVERSE_MAP);

    window.__ANTIGRAVITY_REGEX_RULES__ = REGEX_RULES;

    window.__ANTIGRAVITY_EXEMPTIONS__ = EXEMPTIONS;

    window.__ANTIGRAVITY_EXACT_LOWER__ = null;
    window.__ANTIGRAVITY_PREFIX_ENTRIES__ = null;



    // Ensure blockquotes and callout alerts don't render with glaring opaque white backgrounds

    try {

        var bqStyle = document.getElementById("antigravity-ui-patch");

        if (!bqStyle) {

            bqStyle = document.createElement("style");

            bqStyle.id = "antigravity-ui-patch";

            bqStyle.textContent = "blockquote:not(.markdown-alert){background-color:rgba(255,255,255,0.08)!important;border-left:4px solid rgba(255,180,160,0.8)!important;border-radius:8px!important;padding:0.6rem 1rem!important;margin:0.8rem 0!important;color:#f1f5f9!important;}blockquote:not(.markdown-alert) *{color:inherit!important;}";

            document.head.appendChild(bqStyle);

        }

    } catch (e) {}

    // Proactively enforce completely transparent #00000000 titlebar overlay controls
    try {
        if (window.electronNative && typeof window.electronNative.setTitleBarOverlay === "function") {
            window.electronNative.setTitleBarOverlay({
                color: "#00000000",
                symbolColor: "#f8fafc",
                height: 30
            });
        }
    } catch (e) {}



    if (window.__antigravity_observer) {

        try {

            window.__antigravity_observer.disconnect();

        } catch (e) {}

    }



    // 1. Controlled Component Reverse Map Hook (Protects Base UI / Radix Select states)

    if (!window.__antigravity_map_hooked) {

        window.__antigravity_map_hooked = true;

        var origHas = Map.prototype.has;

        var origGet = Map.prototype.get;



        Map.prototype.has = function (key) {

            if (origHas.call(this, key)) return true;

            var rev = window.__ANTIGRAVITY_REVERSE_MAP__ || REVERSE_MAP;

            if (typeof key === "string" && rev[key]) {

                return origHas.call(this, rev[key]);

            }

            return false;

        };



        Map.prototype.get = function (key) {

            var val = origGet.call(this, key);

            if (val !== undefined) return val;

            var rev = window.__ANTIGRAVITY_REVERSE_MAP__ || REVERSE_MAP;

            if (typeof key === "string" && rev[key]) {

                return origGet.call(this, rev[key]);

            }

            return undefined;

        };

    }



    // 2. Isolation & Exemption Checks

    var EXCLUDED_TAGS = {

        "SCRIPT": true,

        "STYLE": true,

        "PRE": true,

        "CODE": true,

        "TEXTAREA": true,
        "INPUT": true,
        "KBD": true,
        "SAMP": true,
        "VAR": true

    };



    function isInsideExcluded(node) {
        var curr = node;
        while (curr && curr !== document.body && curr !== document.documentElement) {
            if (curr.nodeType === 1) {
                var tag = curr.tagName;
                if (EXCLUDED_TAGS[tag]) return true;
                if (curr.isContentEditable) return true;
                var cls = curr.className;
                if (typeof cls === 'string' && (
                    cls.indexOf('monaco-editor') !== -1 ||
                    cls.indexOf('token') !== -1 ||
                    cls.indexOf('syntax') !== -1 ||
                    cls.indexOf('prose') !== -1 ||
                    cls.indexOf('rendered-markdown') !== -1 ||
                    cls.indexOf('message-content') !== -1 ||
                    cls.indexOf('chat-message-text') !== -1 ||
                    cls.indexOf('terminal') !== -1 ||
                    cls.indexOf('xterm') !== -1 ||
                    cls.indexOf('cm-editor') !== -1 ||
                    cls.indexOf('ace_editor') !== -1 ||
                    cls.indexOf('chat-input') !== -1 ||
                    cls.indexOf('user-message') !== -1 ||
                    cls.indexOf('assistant-message') !== -1
                )) {
                    return true;
                }
                if (typeof curr.hasAttribute === 'function') {
                    if (curr.hasAttribute('data-message-id') ||
                        (curr.hasAttribute('data-testid') && (curr.getAttribute('data-testid') || '').indexOf('message-body') !== -1)) {
                        return true;
                    }
                }
            }
            curr = curr.parentNode;
        }
        return false;
    }

function isExempt(text) {

        var exemptions = window.__ANTIGRAVITY_EXEMPTIONS__ || EXEMPTIONS;

        for (var i = 0; i < exemptions.length; i++) {

            if (text.indexOf(exemptions[i]) !== -1) {

                return true;

            }

        }

        return false;

    }



    function getTranslatedText(original) {

        var trimmed = original.trim();

        if (!trimmed) return null;

        if (isExempt(original)) return null;

        /* TECHNICAL_PROTECTION_GUARD */
        // 1. 纯符号与数字防护
        if (/^[\d\s\-_.,:;!?'"()\[\]{}<>/\\@#$%^&*+=|~`]+$/.test(trimmed)) return null;
        // 2. 文件路径与 URL 标识防护
        if (/^(?:[a-zA-Z]:[\\/]|\/|https?:\/\/|file:\/\/|\.\/|\.\.\/|ws:\/\/|wss:\/\/)/i.test(trimmed)) return null;
        // 3. 命令行与参数防护
        if (/^--?[a-zA-Z0-9_-]+(?:=[^\s]+)?$/.test(trimmed)) return null;
        if (/^(?:\$|npm|pnpm|yarn|npx|node|python|git|curl|powershell|cmd|sh|bash|docker)\s+/i.test(trimmed)) return null;
        // 4. 代码语句特征防护
        if (/^(?:import\s+|export\s+|const\s+|let\s+|var\s+|function\s+|def\s+|class\s+|return\s+)/.test(trimmed)) return null;
        // 5. 文件扩展名防护
        if (/^[a-zA-Z0-9_\-\.]+\.(?:json|py|js|ts|tsx|jsx|css|html|md|asar|pak|exe|dll|yml|yaml|txt|log|lock|ico|png|jpg|svg|gz|zip)$/i.test(trimmed)) return null;
        // 6. 模型标识符防护
        if (/^(?:gemini|claude|gpt|deepseek|dall-e|text-embedding|florence|whisper)-[a-zA-Z0-9\.\-_]+$/i.test(trimmed)) return null;



        var exactMap = window.__ANTIGRAVITY_EXACT__ || EXACT;

        var regexList = window.__ANTIGRAVITY_REGEX_RULES__ || REGEX_RULES;



        // Exact match

        if (exactMap[trimmed]) {

            var target = exactMap[trimmed];

            var leading = original.match(/^\s*/)[0];

            var trailing = original.match(/\s*$/)[0];

            return leading + target + trailing;

        }

        // Whitespace & Linebreak normalized exact match (Handles multiline JSX/HTML formatting)
        var normSpace = trimmed.replace(/\s+/g, " ");
        if (exactMap[normSpace]) {
            var target = exactMap[normSpace];
            var leading = original.match(/^\s*/)[0];
            var trailing = original.match(/\s*$/)[0];
            return leading + target + trailing;
        }

        // Punctuation tolerance (with or without ending dot/ellipsis)
        var normSpaceWithDot = normSpace + ".";
        if (exactMap[normSpaceWithDot]) {
            var target = exactMap[normSpaceWithDot];
            var leading = original.match(/^\s*/)[0];
            var trailing = original.match(/\s*$/)[0];
            return leading + target + trailing;
        }
        var normSpaceWithoutDot = normSpace.replace(/[.。…]+$/, "");
        if (exactMap[normSpaceWithoutDot]) {
            var target = exactMap[normSpaceWithoutDot];
            var leading = original.match(/^\s*/)[0];
            var trailing = original.match(/\s*$/)[0];
            return leading + target + trailing;
        }




        // Ellipsis normalization (support both ... and …)

        var norm = trimmed.replace(/…/g, "...");

        if (exactMap[norm]) {

            var target = exactMap[norm];

            var leading = original.match(/^\s*/)[0];

            var trailing = original.match(/\s*$/)[0];

            return leading + target + trailing;

        }



        // Case-insensitive exact match fallback (handles Title Case vs lowercase prepositions)

        var lower = trimmed.toLowerCase();

        if (!window.__ANTIGRAVITY_EXACT_LOWER__) {

            var lowMap = {};

            for (var ek in exactMap) {

                if (exactMap.hasOwnProperty(ek)) {

                    lowMap[ek.toLowerCase()] = exactMap[ek];

                }

            }

            window.__ANTIGRAVITY_EXACT_LOWER__ = lowMap;

        }

        if (window.__ANTIGRAVITY_EXACT_LOWER__[lower]) {

            var target = window.__ANTIGRAVITY_EXACT_LOWER__[lower];

            var leading = original.match(/^\s*/)[0];

            var trailing = original.match(/\s*$/)[0];

            return leading + target + trailing;

        }



        // 4. Regex dynamic rules (higher priority than prefix matching)

        // Marketplace "See X more" / "See less"
        if (/^(?:\+\s*)?See\s+(\d+)\s+more(?:\s+(.*))?$/i.test(trimmed)) {
            var m = trimmed.match(/^(?:\+\s*)?See\s+(\d+)\s+more(?:\s+(.*))?$/i);
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            var plus = /^\+/.test(trimmed) ? "+ " : "";
            return lead + plus + "查看另外 " + m[1] + " 个" + (m[2] ? " " + m[2] : "") + trail;
        }
        if (/^See\s+more(?:\s+(.*))?$/i.test(trimmed)) {
            var m = trimmed.match(/^See\s+more(?:\s+(.*))?$/i);
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + "查看更多" + (m[1] ? " " + m[1] : "") + trail;
        }
        if (/^See\s+(?:less|fewer)$/i.test(trimmed)) {
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + "收起" + trail;
        }


        // Background Commands badge & text: "Background Commands", "Background Commands 4"
        if (/^Background\s+Commands(?:\s+(\d+))?$/i.test(trimmed)) {
            var m = trimmed.match(/^Background\s+Commands(?:\s+(\d+))?$/i);
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + "后台命令" + (m[1] ? " " + m[1] : "") + trail;
        }

        // Relative time ago: "49m ago", "4m ago", "2h ago", "1d ago", "30s ago", "just now"
        if (/^(\d+)\s*([smhd])\s+ago$/i.test(trimmed)) {
            var m = trimmed.match(/^(\d+)\s*([smhd])\s+ago$/i);
            var unitMap = { s: "秒前", m: "分钟前", h: "小时前", d: "天前" };
            var unit = unitMap[m[2].toLowerCase()] || "前";
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + m[1] + unit + trail;
        }
        if (/^just\s+now$/i.test(trimmed)) {
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + "刚刚" + trail;
        }

        // Git files changed: "6 files changed", "1 file changed"
        if (/^(\d+)\s+files?\s+changed$/i.test(trimmed)) {
            var count = trimmed.match(/^(\d+)/)[1];
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + count + " 个文件变更" + trail;
        }

        // Dynamic Updated and Created dates
        if (/^Updated\s+(.+)$/i.test(trimmed)) {
            var rest = trimmed.match(/^Updated\s+(.+)$/i)[1];
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + "更新于 " + rest + trail;
        }
        if (/^Created\s+(.+)$/i.test(trimmed)) {
            var rest = trimmed.match(/^Created\s+(.+)$/i)[1];
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + "创建于 " + rest + trail;
        }

        // Dynamic Quota & Usage Patterns
        // 1. "(\d+)% left" -> "剩余 $1%"
        if (/^(\d+)%\s+left$/i.test(trimmed)) {
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + trimmed.replace(/^(\d+)%\s+left$/i, "剩余 $1%") + trail;
        }

        // 2. "(\d+)h limit" -> "$1小时限额", "(\d+)d limit" -> "$1天限额", "(\d+)m limit" -> "$1分钟限额"
        if (/^(\d+)\s*h\s+limit$/i.test(trimmed)) {
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + trimmed.replace(/^(\d+)\s*h\s+limit$/i, "$1小时限额") + trail;
        }
        if (/^(\d+)\s*d\s+limit$/i.test(trimmed)) {
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + trimmed.replace(/^(\d+)\s*d\s+limit$/i, "$1天限额") + trail;
        }
        if (/^(\d+)\s*m\s+limit$/i.test(trimmed)) {
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + trimmed.replace(/^(\d+)\s*m\s+limit$/i, "$1分钟限额") + trail;
        }

        // 3. "Resets in X" -> "X后重置"
        if (/^resets\s+in\s+(.+)$/i.test(trimmed)) {
            var timePart = trimmed.match(/^resets\s+in\s+(.+)$/i)[1];
            var formattedTime = timePart
                .replace(/(\d+)\s*d(ays?)?/gi, "$1天 ")
                .replace(/(\d+)\s*h(ours?)?/gi, "$1小时 ")
                .replace(/(\d+)\s*m(in(utes?)?)?/gi, "$1分钟 ")
                .replace(/(\d+)\s*s(ec(onds?)?)?/gi, "$1秒 ")
                .replace(/\s+/g, " ")
                .trim();
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + formattedTime + "后重置" + trail;
        }

        // Browser Subagent split link text fallback
        if (/^to\s+be\s+installed\.\s*The\s+browser\s+subagent/i.test(trimmed)) {
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + "已安装。可在会话输入框中输入 /browser 唤起浏览器子智能体。" + trail;
        }

        // Rules Translation Patterns
        if (/^规则\s*\(Rules\)$/i.test(trimmed)) {
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + "规则" + trail;
        }
        if (/^Routing map for the Google Cloud skill catalog\.?$/i.test(trimmed)) {
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + "Google Cloud 官方技能生态目录路由与自动发现映射规范。" + trail;
        }
        if (/^google-cloud-discovery\.md:\s*Routing map for the Google Cloud skill catalog\.?$/i.test(trimmed)) {
            var lead = original.match(/^\s*/)[0];
            var trail = original.match(/\s*$/)[0];
            return lead + "google-cloud-discovery.md: Google Cloud 官方技能生态目录路由与自动发现映射规范。" + trail;
        }

        var matched = false;

        var current = trimmed;



        // First apply time units if contained

        current = current.replace(/(\d+)\s+days?/g, "$1 天")

                         .replace(/(\d+)\s+hours?/g, "$1 小时")

                         .replace(/(\d+)\s+minutes?/g, "$1 分钟");



        for (var i = 0; i < regexList.length; i++) {

            if (regexList[i].re.test(current)) {

                current = current.replace(regexList[i].re, regexList[i].rep);

                matched = true;

                break;

            }

        }



        if (matched || current !== trimmed) {

            var lead = original.match(/^\s*/)[0];

            var trail = original.match(/\s*$/)[0];

            return lead + current + trail;

        }



        // 5. Pre-indexed prefix match for truncated UI descriptions
        if (trimmed.length >= 15) {
            if (!window.__ANTIGRAVITY_PREFIX_ENTRIES__) {
                var pList = [];
                for (var ek in exactMap) {
                    if (exactMap.hasOwnProperty(ek)) {
                        if (ek.length >= 25) {
                            pList.push({ key: ek.replace(/\.{3,}$|[…]$/, "").trim(), target: exactMap[ek] });
                        }
                    }
                }
                window.__ANTIGRAVITY_PREFIX_ENTRIES__ = pList;
            }
            var pEntries = window.__ANTIGRAVITY_PREFIX_ENTRIES__;
            var cleanTrimmed = trimmed.replace(/\.{3,}$|[…]$/, "").trim();
            for (var p = 0; p < pEntries.length; p++) {
                var item = pEntries[p];
                if (cleanTrimmed.length >= 12 && (item.key.indexOf(cleanTrimmed) === 0 || cleanTrimmed.indexOf(item.key) === 0)) {
                    var leading = original.match(/^\s*/)[0];
                    var trailing = original.match(/\s*$/)[0];
                    return leading + item.target + trailing;
                }
            }
        }
        return null;

    }

    window.__antigravity_getTranslatedText = getTranslatedText;



    // 3. Node Translation Engine (Pure value matching, no harmful WeakSet blocking)

    function translateTextNode(textNode) {

        if (!textNode || textNode.nodeType !== 3) return;

        var val = textNode.nodeValue;

        if (!val || !val.trim()) return;



        if (isInsideExcluded(textNode)) return;



        var translated = getTranslatedText(val);

        if (translated !== null && translated !== val) {

            textNode.nodeValue = translated;

        }

    }



    function translateElementAttributes(el) {

        if (!el || el.nodeType !== 1) return;

        // placeholder (allow on INPUT/TEXTAREA as it does not alter input value)

        if (el.hasAttribute("placeholder")) {

            var ph = el.getAttribute("placeholder");

            var tPh = getTranslatedText(ph);

            if (tPh !== null && tPh !== ph) el.setAttribute("placeholder", tPh);

        }

        if (EXCLUDED_TAGS[el.tagName]) return;

        // title

        if (el.hasAttribute("title")) {

            var tit = el.getAttribute("title");

            var tTit = getTranslatedText(tit);

            if (tTit !== null && tTit !== tit) el.setAttribute("title", tTit);

        }

        // aria-label

        if (el.hasAttribute("aria-label")) {

            var al = el.getAttribute("aria-label");

            var tAl = getTranslatedText(al);

            if (tAl !== null && tAl !== al) el.setAttribute("aria-label", tAl);

        }

    }



    function translateSubtree(root) {

        if (!root) return;

        if (root.nodeType === 3) {

            translateTextNode(root);

            return;

        }

        if (root.nodeType === 1) {

            if (isInsideExcluded(root)) return;

            translateElementAttributes(root);

            var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);

            var node;

            while ((node = walker.nextNode())) {

                translateTextNode(node);

            }

            var elementsWithAttrs = root.querySelectorAll("[placeholder], [title], [aria-label]");

            for (var i = 0; i < elementsWithAttrs.length; i++) {

                translateElementAttributes(elementsWithAttrs[i]);

            }

        }

    }



    // 4. Initial Full Page Translation & Lifecycle Hooks

    function translateWholePage() {

        var target = document.body || document.documentElement;

        if (target) {

            translateSubtree(target);

        }

    }

    window.__antigravity_translateWholePage = translateWholePage;



    translateWholePage();



    if (document.readyState === "loading") {

        document.addEventListener("DOMContentLoaded", translateWholePage);

    }

    window.addEventListener("load", translateWholePage);



    // SPA client-side routing triggers

    window.addEventListener("popstate", function() { setTimeout(translateWholePage, 50); });

    window.addEventListener("hashchange", function() { setTimeout(translateWholePage, 50); });



    // Multi-turn progressive scans for React initial async rendering

    var scanDelays = [100, 250, 500, 1000, 1800, 3000, 5000];

    for (var k = 0; k < scanDelays.length; k++) {

        setTimeout(translateWholePage, scanDelays[k]);

    }



    // 5. High-Performance MutationObserver (Batching via requestAnimationFrame, zero typing lag)
    var pendingNodes = [];
    var rafPending = false;

    function processPendingNodes() {
        rafPending = false;
        var batch = pendingNodes;
        pendingNodes = [];
        for (var i = 0; i < batch.length; i++) {
            var node = batch[i];
            if (!node) continue;
            if (node.nodeType === 3) {
                translateTextNode(node);
            } else if (node.nodeType === 1) {
                translateSubtree(node);
            }
        }
    }

    var observer = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
            var m = mutations[i];
            if (m.type === 'childList') {
                for (var j = 0; j < m.addedNodes.length; j++) {
                    var n = m.addedNodes[j];
                    if ((n.nodeType === 1 || n.nodeType === 3) && !isInsideExcluded(n)) {
                        pendingNodes.push(n);
                    }
                }
            } else if (m.type === 'attributes') {
                if (m.target && m.target.nodeType === 1 && !isInsideExcluded(m.target)) {
                    translateElementAttributes(m.target);
                }
            }
        }
        if (pendingNodes.length > 0 && !rafPending) {
            rafPending = true;
            requestAnimationFrame(processPendingNodes);
        }
    });

    function startObserving() {
        var root = document.documentElement || document.body;
        if (root) {
            observer.observe(root, {
                childList: true,
                subtree: true,
                attributeFilter: ['placeholder', 'title', 'aria-label']
            });
        } else {
            setTimeout(startObserving, 30);
        }
    }
    startObserving();
    window.__antigravity_observer = observer;

    console.log('[Antigravity i18n] Localization runner successfully initialized and active.');

})();
