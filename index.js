/***********************
 * توابع مربوط به کپچای احراز هویت مجدد (4 رقمی)
 ***********************/
function generateReauthCaptcha() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}
let reauthCaptcha = generateReauthCaptcha();
function updateReauthCaptchaDisplay() {
    const display = document.getElementById("reauth-captcha-display");
    if (display) {
        display.textContent = reauthCaptcha;
    }
}
function regenerateReauthCaptcha() {
    reauthCaptcha = generateReauthCaptcha();
    updateReauthCaptchaDisplay();
}

document.addEventListener("DOMContentLoaded", () => {
    /******** بررسی وضعیت ورود (با استفاده از sessionStorage) ********/
    const loggedInUser = sessionStorage.getItem("loggedInUser");
    if (loggedInUser) {
        // اگر کاربر قبلاً وارد شده باشد، فرم ورود اصلی را پنهان و فرم احراز هویت مجدد را نمایش می‌دهیم
        document.getElementById("login-page").style.display = "none";
        document.getElementById("reauth-page").style.display = "block";
    }

    /******** تنظیم رویدادهای مربوط به فرم احراز هویت مجدد ********/
    updateReauthCaptchaDisplay();
    const reauthRefreshBtn = document.getElementById("reauth-refresh-captcha");
    if (reauthRefreshBtn) {
        reauthRefreshBtn.addEventListener("click", regenerateReauthCaptcha);
    }
    const reauthForm = document.getElementById("reauth-form");
    if (reauthForm) {
        reauthForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const inputUserId = document.getElementById("reauth-userId").value.trim();
            const inputCaptcha = document.getElementById("reauth-captcha-input").value.trim();
            if (inputUserId !== loggedInUser || inputCaptcha !== reauthCaptcha) {
                document.getElementById("reauth-error").textContent = "احراز هویت ناموفق.";
                document.getElementById("reauth-error").style.display = "block";
                regenerateReauthCaptcha();
                return;
            }
            document.getElementById("reauth-error").style.display = "none";
            // در صورت صحت احراز هویت، فرم احراز را پنهان و صفحه اصلی نمایش داده می‌شود
            document.getElementById("reauth-page").style.display = "none";
            document.getElementById("main-page").style.display = "block";
        });
    }

    /******** توابع تبدیل تاریخ شمسی به میلادی ********/
    function jalaliToJDN(jy, jm, jd) {
        const epbase = jy - (jy >= 0 ? 474 : 473);
        const epyear = 474 + (epbase % 2820);
        return (
            jd +
            (jm <= 7 ? (jm - 1) * 31 : (jm - 1) * 30 + 6) +
            Math.floor((epyear * 682 - 110) / 2816) +
            (epyear - 1) * 365 +
            Math.floor(epbase / 2820) * 1029983 +
            (1948320 - 1)
        );
    }
    function d2g(jdn) {
        let j = 4 * jdn + 139361631;
        j = j + Math.floor((4 * jdn + 183187720) / 146097) * (3 / 4) - 3908;
        const i = Math.floor((j % 1461) / 4) * 5 + 308;
        const gd = Math.floor((i % 153) / 5) + 1;
        const gm = (Math.floor(i / 153) % 12) + 1;
        const gy = Math.floor(j / 1461) - 100100 + Math.floor((8 - gm) / 6);
        return { gy, gm, gd };
    }
    function jalaliToGregorian(jy, jm, jd) {
        const jdn = jalaliToJDN(jy, jm, jd);
        return d2g(jdn);
    }
    function parseJalaliDate(jalaliDateStr) {
        const parts = jalaliDateStr.split("/");
        if (parts.length !== 3) return null;
        const jd = parseInt(parts[0], 10);
        const jm = parseInt(parts[1], 10);
        const jy = parseInt(parts[2], 10);
        const g = jalaliToGregorian(jy, jm, jd);
        return new Date(g.gy, g.gm - 1, g.gd);
    }

    /******** کلاس‌های مشترک (IPState, IPUtils) ********/
    class IPState {
        constructor(maxHistoryItems = 20, storageKey = null) {
            this.ranges = new Map();
            this.maxHistoryItems = maxHistoryItems;
            this.observers = new Set();
            this.storageKey = storageKey;
            if (this.storageKey) {
                const stored = localStorage.getItem(this.storageKey);
                if (stored) {
                    try {
                        this.history = JSON.parse(stored);
                    } catch (e) {
                        this.history = [];
                    }
                } else {
                    this.history = [];
                }
            } else {
                this.history = [];
            }
        }
        addRange(range, type = "custom") {
            if (!this.ranges.has(range)) {
                this.ranges.set(range, { type });
                this.notifyObservers("ranges");
            }
        }
        removeRange(range) {
            if (this.ranges.has(range)) {
                this.ranges.delete(range);
                this.notifyObservers("ranges");
            }
        }
        addToHistory(entry) {
            this.history.unshift(entry);
            if (this.history.length > this.maxHistoryItems) {
                this.history.pop();
            }
            this.notifyObservers("history");
            if (this.storageKey) {
                localStorage.setItem(this.storageKey, JSON.stringify(this.history));
            }
        }
        clearHistory() {
            this.history = [];
            this.notifyObservers("history");
            if (this.storageKey) {
                localStorage.removeItem(this.storageKey);
            }
        }
        addObserver(observer) {
            this.observers.add(observer);
        }
        notifyObservers(type) {
            this.observers.forEach((observer) => observer(type));
        }
    }
    class IPUtils {
        static ipv4Cache = new Map();
        static ipv6Cache = new Map();
        static async ipv4ToInt(ip) {
            if (this.ipv4Cache.has(ip)) return this.ipv4Cache.get(ip);
            const parts = ip.split(".");
            if (parts.length !== 4)
                throw new Error("آدرس IPv4 نامعتبر است.");
            let result = 0;
            for (let i = 0; i < 4; i++) {
                const part = parseInt(parts[i], 10);
                if (isNaN(part) || part < 0 || part > 255) {
                    throw new Error("بخش‌های IPv4 باید بین 0 تا 255 باشند.");
                }
                result = (result << 8) + part;
            }
            this.ipv4Cache.set(ip, result);
            return result;
        }
        static intToIPv4(num) {
            return [
                (num >>> 24) & 0xff,
                (num >>> 16) & 0xff,
                (num >>> 8) & 0xff,
                num & 0xff,
            ].join(".");
        }
        static async expandIPv6Address(address) {
            if (this.ipv6Cache.has(address)) return this.ipv6Cache.get(address);
            const parts = address.split("::");
            if (parts.length > 2)
                throw new Error("آدرس IPv6 نامعتبر است.");
            const head = parts[0] ? parts[0].split(":") : [];
            const tail = parts[1] ? parts[1].split(":") : [];
            const missing = 8 - (head.length + tail.length);
            if (missing < 0) throw new Error("آدرس IPv6 نامعتبر است.");
            const fullAddress = [
                ...head,
                ...Array(missing).fill("0"),
                ...tail,
            ].map((part) => part.padStart(4, "0"));
            this.ipv6Cache.set(address, fullAddress);
            return fullAddress;
        }
    }
    function randomBigInt(max) {
        const bits = max.toString(2).length;
        const bytes = Math.ceil(bits / 8);
        let rand;
        do {
            const randomBytes = new Uint8Array(bytes);
            window.crypto.getRandomValues(randomBytes);
            let hex = "";
            randomBytes.forEach((byte) => {
                hex += byte.toString(16).padStart(2, "0");
            });
            rand = BigInt("0x" + hex);
        } while (rand >= max);
        return rand;
    }
    function bigIntToIPv6(bigInt) {
        let hex = bigInt.toString(16).padStart(32, "0");
        const parts = [];
        for (let i = 0; i < 32; i += 4) {
            parts.push(hex.substr(i, 4));
        }
        return parts.join(":");
    }

    /******** کلاس UIManager برای رابط کاربری ********/
    class UIManager {
        constructor(version, prefix) {
            this.version = version; // "IPv4" یا "IPv6"
            this.prefix = prefix; // "ipv4" یا "ipv6"
            this.state = new IPState(
                20,
                this.version === "IPv4" ? "IPv4History" : "IPv6History"
            );
            if (this.version === "IPv4") {
                this.locationMapping = {
                    Location1: [
                        "185.50.120.0/23",
                        "185.107.52.0/22",
                        "185.126.28.0/22",
                        "185.157.83.0/24",
                        "185.157.176.0/22",
                        "185.171.224.0/22",
                        "185.189.228.0/22",
                        "185.209.124.0/22",
                        "185.213.45.0/24",
                        "185.216.237.0/24",
                        "185.226.99.0/24",
                        "185.228.8.0/23",
                        "185.242.76.0/24"
                    ],
                    Location2: [
                        "78.166.128.0/20",
                        "78.166.144.0/21",
                        "78.169.68.0/22",
                        "78.171.72.0/21",
                        "78.171.88.0/21",
                        "78.173.208.0/20",
                        "78.173.224.0/19",
                        "78.184.64.0/18",
                        "78.190.0.0/20",
                        "78.190.48.0/20",
                        "88.230.64.0/19",
                        "88.230.248.0/21",
                        "88.238.128.0/18",
                        "88.241.192.0/18"
                    ],
                    Location3: [
                        "5.107.0.0/16",
                        "5.192.0.0/14",
                        "3.0.0.0/15",
                        "3.8.0.0/13",
                        "13.32.0.0/23",
                    ],
                    "سرور گیمینگ": [
                        "185.100.160.0/22",
                        "185.101.244.0/22",
                        "185.157.101.0/24",
                        "185.161.176.0/22",
                        "185.163.76.0/22",
                        "185.180.224.0/24",
                        "185.183.212.0/22",
                        "185.188.64.0/24",
                        "185.195.239.0/24",
                        "185.198.13.0/24",
                        "185.202.32.0/21",
                        "185.207.46.0/24",
                        "185.237.0.0/23",
                        "185.237.2.0/24",
                        "185.242.224.0/24",
                        "185.243.44.0/22",
                        "212.107.195.0/24",
                        "212.107.196.0/24",
                        "212.107.201.0/24",
                        "212.107.203.0/24",
                        "212.107.205.0/24",
                        "212.107.207.0/24",
                        "212.107.222.0/24",
                        "212.120.160.0/19",
                        "212.122.7.0/24",
                        "212.122.22.0/23",
                        "212.124.0.0/20",
                        "212.124.19.0/24",
                        "212.164.0.0/16",
                        "212.220.0.0/17",
                        "212.220.128.0/18",
                        "212.220.192.0/20"
                    ],
                };
            } else {
                this.locationMapping = {
                    Location1: [
                        {
                            generate: function generateGamingIPv6() {
                                const prefix = "2a06:1301:4050";
                                const part1 = Math.floor(Math.random() * 0x10000).toString(16);
                                const part2 = Math.floor(Math.random() * 0x10000).toString(16);
                                return `${prefix}:${part1}:${part2}::1`;
                            }
                        }
                    ],
                    Location2: [
                        {
                            generate: function generateGamingIPv6() {
                                const prefix = "2a00:1d34:8000";
                                const part1 = Math.floor(Math.random() * 0x10000).toString(16);
                                const part2 = Math.floor(Math.random() * 0x10000).toString(16);
                                return `${prefix}:${part1}:${part2}::1`;
                            }
                        }
                    ],

                    Location3: [
                        {
                            generate: function generateGamingIPv6() {
                                const prefix = "2406:da14";
                                const part1 = Math.floor(Math.random() * 0x10000).toString(16);
                                const part2 = Math.floor(Math.random() * 0x10000).toString(16);
                                const part3 = Math.floor(Math.random() * 0x10000).toString(16);  // اضافه کردن part3
                                return `${prefix}:${part1}:${part2}:${part3}::1`;
                            }
                        }
                    ],

                    "سرور گیمینگ": { type: "gaming", generate: generateGamingIPv6 },
                };
            }
            this.setupElements();
            this.setupEventListeners();
        }
        setupElements() {
            this.elements = {
                section: document.getElementById(`${this.prefix}-section`),
                locationSelect: document.getElementById(`${this.prefix}-location-select`),
                countInput: document.getElementById(`${this.prefix}-count`),
                result: document.getElementById(`${this.prefix}-result`),
                history: document.getElementById(`${this.prefix}-history`),
                loading: document.querySelector(`#${this.prefix}-section .loading`),
                buttons: {
                    generate: document.getElementById(`${this.prefix}-generate`),
                    copy: document.getElementById(`${this.prefix}-copy`),
                    clearHistory: document.getElementById(`${this.prefix}-clear-history`),
                    downloadHistory: document.getElementById(`${this.prefix}-download-history`),
                },
            };
        }
        setupEventListeners() {
            this.elements.buttons.generate.addEventListener("click", () => this.handleGenerate());
            this.elements.buttons.copy.addEventListener("click", () => this.handleCopy());
            this.elements.buttons.clearHistory.addEventListener("click", () => this.handleClearHistory());
            this.elements.buttons.downloadHistory.addEventListener("click", () => this.handleDownloadHistory());
            this.state.addObserver((type) => this.updateUI(type));
        }
        async handleGenerate() {
            const locationSelect = this.elements.locationSelect;
            if (!locationSelect) {
                this.showToast("لوکیشن انتخاب نشده است.");
                return;
            }
            const selectedLocation = locationSelect.value;
            if (!selectedLocation) {
                this.showToast("لطفاً یک لوکیشن انتخاب کنید.");
                return;
            }
            const mappingValue = this.locationMapping[selectedLocation];
            if (!mappingValue) {
                this.showToast("رنج مربوط به این لوکیشن یافت نشد.");
                return;
            }
            let count = parseInt(this.elements.countInput.value, 10);
            if (isNaN(count) || count < 1) count = 1;
            if (count > 100) {
                this.showToast("حداکثر تعداد 100 می‌باشد.");
                return;
            }
            this.showLoading();
            try {
                let ips;
                if (
                    this.version === "IPv6" &&
                    typeof mappingValue === "object" &&
                    mappingValue.type === "gaming"
                ) {
                    ips = await Promise.all(
                        Array.from({ length: count }, () => mappingValue.generate())
                    );
                    this.state.addToHistory({
                        ip: ips.join("\n"),
                        location: selectedLocation,
                        range: "3505:aa93:aa02:****:****::/64",
                        count,
                        timestamp: new Date(),
                    });
                } else {
                    ips = await Promise.all(
                        Array.from({ length: count }, () => this.generateIP(mappingValue))
                    );
                    this.state.addToHistory({
                        ip: ips.join("\n"),
                        location: selectedLocation,
                        range: mappingValue,
                        count,
                        timestamp: new Date(),
                    });
                }
                this.elements.result.value = ips.join("\n");
            } catch (e) {
                this.showToast(`خطا: ${e.message}`);
            } finally {
                this.hideLoading();
            }
        }
        async handleCopy() {
            try {
                await navigator.clipboard.writeText(this.elements.result.value);
                this.showToast("کپی شد!");
            } catch (e) {
                this.elements.result.select();
                document.execCommand("copy");
                this.showToast("کپی شد!");
            }
        }
        handleClearHistory() {
            if (confirm("آیا مطمئن هستید که می‌خواهید تاریخچه را پاک کنید؟")) {
                this.state.clearHistory();
            }
        }
        handleDownloadHistory() {
            const historyText = this.state.history
                .map(
                    (entry) =>
                        `${new Date(entry.timestamp).toLocaleString()} - ${entry.location} (${entry.range}) (${entry.count}): ${entry.ip}`
                )
                .join("\n");
            const blob = new Blob([historyText], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${this.version}_history.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        showLoading() {
            this.elements.loading.style.display = "flex";
            Object.values(this.elements.buttons).forEach((btn) => (btn.disabled = true));
        }
        hideLoading() {
            this.elements.loading.style.display = "none";
            Object.values(this.elements.buttons).forEach((btn) => (btn.disabled = false));
        }
        showToast(message, duration = 3000) {
            const toastEl = document.getElementById("toast");
            if (toastEl) {
                toastEl.textContent = message;
                toastEl.style.display = "block";
                setTimeout(() => {
                    toastEl.style.display = "none";
                }, duration);
            }
        }
        updateUI(type) {
            if (type === "history") {
                this.updateHistory();
            }
        }
        updateHistory() {
            this.elements.history.innerHTML = this.state.history
                .map(
                    (entry) =>
                        `<li>${entry.ip} (${entry.location} - ${entry.range}) - ${new Date(
                            entry.timestamp
                        ).toLocaleString()}</li>`
                )
                .join("");
        }
        async generateIP(cidr) {
            // اگر cidr یک آرایه باشد، یک مقدار تصادفی از آن انتخاب می‌شود
            if (Array.isArray(cidr)) {
                cidr = cidr[Math.floor(Math.random() * cidr.length)];
            }
            if (typeof cidr !== "string") {
                throw new Error("cidr باید یک رشته یا آرایه‌ای از رشته‌ها باشد.");
            }
            const parts = cidr.split("/");
            if (parts.length !== 2) {
                throw new Error("cidr نامعتبر است. فرمت صحیح: ip/prefix");
            }
            const [ip, prefix] = parts;
            const prefixNum = parseInt(prefix, 10);
            if (this.version === "IPv4") {
                const ipInt = await IPUtils.ipv4ToInt(ip);
                const count = Math.pow(2, 32 - prefixNum);
                const mask = prefixNum === 0 ? 0 : (0xFFFFFFFF << (32 - prefixNum)) >>> 0;
                const network = ipInt & mask;
                const randomOffset = Math.floor(Math.random() * count);
                const randomIPInt = network + randomOffset;
                return IPUtils.intToIPv4(randomIPInt);
            } else {
                const fullAddress = await IPUtils.expandIPv6Address(ip);
                let ipBigInt = 0n;
                for (let part of fullAddress) {
                    ipBigInt = (ipBigInt << 16n) + BigInt(parseInt(part, 16));
                }
                const hostBits = BigInt(128 - prefixNum);
                const count = 1n << hostBits;
                const mask = ((1n << 128n) - 1n) - ((1n << hostBits) - 1n);
                const network = ipBigInt & mask;
                const randomOffset = randomBigInt(count);
                const randomIPBigInt = network + randomOffset;
                return bigIntToIPv6(randomIPBigInt);
            }
        }
    }

    /******** تابع تولید آدرس IPv6 سرور گیمینگ ********/
    async function generateGamingIPv6() {
        function getRandomHexBlock() {
            return Math.floor(Math.random() * 0x10000)
                .toString(16)
                .padStart(4, "0");
        }
        const part1 = getRandomHexBlock();
        const part2 = getRandomHexBlock();
        return `3505:aa93:aa02:${part1}:${part2}::1`;
    }

    /******** کلاس CountryLookupManager ********/
    class CountryLookupManager {
        constructor(prefix) {
            this.prefix = prefix;
            this.setupElements();
            this.setupEventListeners();
        }
        setupElements() {
            this.section = document.getElementById(`${this.prefix}-section`);
            this.loading = this.section.querySelector(".loading");
            this.input =
                document.getElementById(`${this.prefix}-input`) ||
                document.getElementById("ip-country-input");
            this.lookupButton =
                document.getElementById(`${this.prefix}-lookup`) ||
                document.getElementById("ip-country-lookup");
            this.result =
                document.getElementById(`${this.prefix}-result`) ||
                document.getElementById("ip-country-result");
            this.copyButton =
                document.getElementById(`${this.prefix}-copy`) ||
                document.getElementById("ip-country-copy");
            this.progressContainer = this.section.querySelector(".progress-container");
            this.progressBar = this.section.querySelector(".progress-bar");
        }
        setupEventListeners() {
            this.lookupButton.addEventListener("click", () => this.handleLookup());
            this.copyButton.addEventListener("click", () => this.handleCopy());
        }
        resetProgress() {
            if (this.progressBar) {
                this.progressBar.style.width = "0%";
            }
        }
        setProgress(percentage) {
            if (this.progressBar) {
                this.progressBar.style.width = `${percentage}%`;
            }
        }
        async handleLookup() {
            const ip = this.input.value.trim();
            if (!ip) {
                this.showToast("لطفاً یک آدرس IP وارد کنید.");
                return;
            }
            this.resetProgress();
            this.showLoading();
            const duration = 3000;
            const intervalTime = 100;
            const steps = duration / intervalTime;
            let currentStep = 0;
            const intervalId = setInterval(() => {
                currentStep++;
                const percentage = (currentStep / steps) * 100;
                this.setProgress(percentage);
                if (currentStep >= steps) {
                    clearInterval(intervalId);
                    this.doLookup(ip);
                }
            }, intervalTime);
        }
        async doLookup(ip) {
            try {
                const data = await this.lookupCountry(ip);
                if (data.error) {
                    throw new Error(data.error);
                }
                const resultText = `آدرس: ${data.ip}
  شماره IP: ${data.ip_number || "نامشخص"}
  نسخه: IPv${data.ip_version || "نامشخص"}
  کشور: ${data.country_name || "نامشخص"} (${data.country_code2 || data.country_code || "نامشخص"})
  ISP: ${data.isp || "نامشخص"}`;
                this.result.value = resultText;
            } catch (e) {
                this.showToast(`خطا: ${e.message}`);
            } finally {
                this.hideLoading();
            }
        }
        async lookupCountry(ip) {
            const url = `https://api.iplocation.net/?cmd=ip-country&ip=${ip}&format=json`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }
            const data = await response.json();
            return data;
        }
        async handleCopy() {
            try {
                await navigator.clipboard.writeText(this.result.value);
                this.showToast("کپی شد!");
            } catch (e) {
                this.result.select();
                document.execCommand("copy");
                this.showToast("کپی شد!");
            }
        }
        showLoading() {
            this.loading.style.display = "flex";
            this.lookupButton.disabled = true;
            this.copyButton.disabled = true;
        }
        hideLoading() {
            this.loading.style.display = "none";
            this.lookupButton.disabled = false;
            this.copyButton.disabled = false;
        }
        showToast(message, duration = 3000) {
            const toastEl = document.getElementById("toast");
            if (toastEl) {
                toastEl.textContent = message;
                toastEl.style.display = "block";
                setTimeout(() => {
                    toastEl.style.display = "none";
                }, duration);
            }
        }
    }

    /******** ورود و اعتبارسنجی کاربر ********/
    const validUsers = [
        { username: "amir", password: "amir", userId: "1", expiration: "lifetime", created: new Date() },
        // { username: "user30", password: "pass30", userId: "user30", expiration: 30, created: new Date(new Date().getTime() - 20 * 24 * 60 * 60 * 1000) },
        // { username: "user60", password: "pass60", userId: "user60", expiration: 60, created: new Date(new Date().getTime() - 10 * 24 * 60 * 60 * 1000) },
        // { username: "user90", password: "pass90", userId: "user90", expiration: 90, created: new Date(new Date().getTime() - 91 * 24 * 60 * 60 * 1000) },
        // { username: "user120", password: "pass120", userId: "user120", expiration: 120, created: new Date(new Date().getTime() - 100 * 24 * 60 * 60 * 1000) },
    ];
    const loginForm = document.getElementById("login-form");
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();
        const userId = document.getElementById("userId").value.trim();
        const user = validUsers.find(
            (u) => u.username === username && u.password === password && u.userId === userId
        );
        if (user) {
            let expired = false;
            if (user.expiration !== "lifetime") {
                let expDate = new Date(user.created.getTime() + user.expiration * 24 * 60 * 60 * 1000);
                if (new Date() > expDate) {
                    expired = true;
                }
            }
            if (expired) {
                document.getElementById("login-error").textContent = "اعتبار کاربر منقضی شده است.";
                document.getElementById("login-error").style.display = "block";
            } else {
                document.getElementById("login-error").style.display = "none";
                sessionStorage.setItem("loggedInUser", user.userId);
                loginForm.style.display = "none";
                const loginLoading = document.getElementById("login-loading");
                loginLoading.style.display = "flex";
                setTimeout(() => {
                    document.getElementById("login-page").style.display = "none";
                    document.getElementById("main-page").style.display = "block";
                }, 3000);
            }
        } else {
            document.getElementById("login-error").textContent = "اعتبارسنجی ناموفق";
            document.getElementById("login-error").style.display = "block";
        }
    });

    // راه‌اندازی رابط‌های IPv4، IPv6 و تشخیص کشور IP
    new UIManager("IPv4", "ipv4");
    new UIManager("IPv6", "ipv6");
    new CountryLookupManager("ip-country");
});
