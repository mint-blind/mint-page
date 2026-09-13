const root = document.documentElement;
const body = document.body;

function setLanguage(language) {
  const nextLanguage = language === "zh" ? "zh" : "en";
  root.dataset.language = nextLanguage;
  root.lang = nextLanguage === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-language-option]").forEach((option) => {
    option.classList.toggle("is-active", option.dataset.languageOption === nextLanguage);
  });
  document.title = nextLanguage === "zh"
    ? "MINT — 世界坐标系相机与双手运动估计"
    : "MINT: A Unified Model for World-Space Camera and Hand Motion Estimation";
  try {
    localStorage.setItem("mint-language", nextLanguage);
  } catch (_) {
    // Persistence is optional in privacy-restricted browsers.
  }
}

let storedLanguage = "en";
try {
  storedLanguage = localStorage.getItem("mint-language") || "en";
} catch (_) {
  storedLanguage = "en";
}
setLanguage(storedLanguage);

const distributionLabels = {
  "个人护理/穿戴": "Personal care / dressing",
  "其他": "Other",
  "办公/文具/阅读": "Office / stationery / reading",
  "包装/拆封": "Packaging / unboxing",
  "厨房/烹饪": "Kitchen / cooking",
  "园艺/户外": "Gardening / outdoors",
  "家居/家具/床品": "Home / furniture / bedding",
  "手工/编织/饰品": "Crafts / knitting / jewelry",
  "收纳/容器": "Storage / containers",
  "木工/装修/建材": "Woodwork / renovation",
  "机械/维修/工具": "Mechanical / repair / tools",
  "模型/结构组装": "Model / structural assembly",
  "清洁/洗涤": "Cleaning / washing",
  "玩具/模型": "Toys / models",
  "电子/线缆/设备": "Electronics / cables / devices",
  "益智/桌游": "Puzzles / board games",
  "纺织/衣物/洗衣": "Textile / clothing / laundry",
  "绘画/艺术": "Painting / art",
  "车辆/驾驶": "Vehicles / driving",
  "运动/健身": "Sports / fitness",
  "伸手/触碰": "Reach / touch",
  "倾倒/装填": "Pour / fill",
  "切削/剥皮": "Cut / peel",
  "工具操作": "Tool use",
  "开合": "Open / close",
  "抓握/持握": "Grasp / hold",
  "折叠/包裹": "Fold / wrap",
  "拆卸/分离": "Disassemble / separate",
  "拉动": "Pull",
  "拿取/举起": "Pick up / lift",
  "按压/推动": "Press / push",
  "插入/移除": "Insert / remove",
  "搅拌/混合": "Stir / mix",
  "放置/放下": "Place / set down",
  "旋转/翻转": "Rotate / flip",
  "清洁/擦洗": "Clean / wash",
  "移动/搬运": "Move / carry",
  "组装/连接": "Assemble / connect",
  "绘画/书写": "Draw / write",
  "调整/整理": "Adjust / arrange",
  "进食/饮用": "Eat / drink"
};

function distributionRow(label, count, total) {
  const percent = count / total * 100;
  const row = document.createElement("div");
  row.className = "bar-row";

  const heading = document.createElement("div");
  const english = document.createElement("span");
  english.className = "lang-en";
  english.textContent = distributionLabels[label] || label;
  const chinese = document.createElement("span");
  chinese.className = "lang-zh";
  chinese.textContent = label;
  const value = document.createElement("b");
  value.textContent = percent > 0 && percent < 0.05 ? "<0.1%" : `${percent.toFixed(1)}%`;
  heading.append(english, chinese, value);

  const track = document.createElement("i");
  const fill = document.createElement("span");
  fill.style.setProperty("--value", String(percent));
  track.append(fill);
  row.append(heading, track);
  return row;
}

function effectiveCategoryCount(counts) {
  const values = Object.values(counts).filter((count) => count > 0);
  const total = values.reduce((sum, count) => sum + count, 0);
  if (!total) return 0;
  const entropy = -values.reduce((sum, count) => {
    const probability = count / total;
    return sum + probability * Math.log(probability);
  }, 0);
  return Math.exp(entropy);
}

function updateDistributionSummary(list, counts) {
  const effectiveCount = effectiveCategoryCount(counts).toFixed(2);
  const isActionDistribution = list.dataset.distributionKey === "action_counts";
  const summaries = list.closest("section")?.querySelectorAll("[data-distribution-summary]") || [];
  summaries.forEach((summary) => {
    if (summary.classList.contains("lang-zh")) {
      summary.textContent = isActionDistribution
        ? `有效 ${effectiveCount} · 多标签`
        : `有效 ${effectiveCount}`;
    } else {
      summary.textContent = isActionDistribution
        ? `effective ${effectiveCount} · multi-label`
        : `effective ${effectiveCount}`;
    }
  });
}

const completeDistributionLists = [...document.querySelectorAll("[data-distribution-dataset]")];
if (completeDistributionLists.length) {
  fetch("assets/data/diversity/result.json")
    .then((response) => {
      if (!response.ok) throw new Error(`Diversity report request failed: ${response.status}`);
      return response.json();
    })
    .then((report) => {
      completeDistributionLists.forEach((list) => {
        const dataset = report.datasets.find((item) => item.dataset === list.dataset.distributionDataset);
        const counts = dataset?.text?.[list.dataset.distributionKey];
        const total = dataset?.text?.task_ids;
        if (!counts || !total) return;
        const fragment = document.createDocumentFragment();
        Object.entries(counts)
          .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
          .forEach(([label, count]) => fragment.append(distributionRow(label, count, total)));
        list.replaceChildren(fragment);
        list.classList.add("is-complete");
        updateDistributionSummary(list, counts);
      });
    })
    .catch(() => {
      // The six-row HTML fallback remains visible if the report cannot be loaded.
    });
}

const diversityTabs = [...document.querySelectorAll("[data-diversity-tab]")];
const diversityPanels = [...document.querySelectorAll("[data-diversity-panel]")];
const diversitySection = document.querySelector("#diversity");
const diversityAdvanceDelay = 10000;
const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
let diversityAdvanceTimer;
let diversityInView = false;

function stopDiversityAdvance() {
  window.clearTimeout(diversityAdvanceTimer);
  diversityAdvanceTimer = undefined;
  diversityTabs.forEach((tab) => tab.classList.remove("is-auto-counting"));
}

function scheduleDiversityAdvance() {
  stopDiversityAdvance();
  if (!diversityTabs.length || !diversityInView || document.hidden || reduceMotion) return;
  const activeTab = diversityTabs.find((tab) => tab.classList.contains("is-active"));
  if (!activeTab) return;
  void activeTab.offsetWidth;
  activeTab.classList.add("is-auto-counting");
  diversityAdvanceTimer = window.setTimeout(() => {
    const activeIndex = diversityTabs.indexOf(activeTab);
    const nextTab = diversityTabs[(activeIndex + 1) % diversityTabs.length];
    showDiversityPanel(nextTab.dataset.diversityTab);
  }, diversityAdvanceDelay);
}

function showDiversityPanel(key) {
  diversityPanels.forEach((panel) => {
    panel.hidden = panel.dataset.diversityPanel !== key;
  });
  diversityTabs.forEach((tab) => {
    const active = tab.dataset.diversityTab === key;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  scheduleDiversityAdvance();
}

if (diversityTabs.length) {
  diversityTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => showDiversityPanel(tab.dataset.diversityTab));
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextTab = diversityTabs[(index + direction + diversityTabs.length) % diversityTabs.length];
      showDiversityPanel(nextTab.dataset.diversityTab);
      nextTab.focus();
    });
  });
  diversityPanels.forEach((panel) => {
    panel.addEventListener("mouseenter", stopDiversityAdvance);
    panel.addEventListener("mouseleave", scheduleDiversityAdvance);
    panel.addEventListener("pointerdown", stopDiversityAdvance);
    panel.addEventListener("wheel", stopDiversityAdvance, { passive: true });
  });
  showDiversityPanel(diversityTabs[0].dataset.diversityTab);
}

if (diversitySection && "IntersectionObserver" in window) {
  const diversityObserver = new IntersectionObserver(([entry]) => {
    diversityInView = entry.isIntersecting;
    if (diversityInView) scheduleDiversityAdvance();
    else stopDiversityAdvance();
  }, { threshold: 0.12 });
  diversityObserver.observe(diversitySection);
} else if (diversitySection) {
  diversityInView = true;
  scheduleDiversityAdvance();
}

function toggleLanguage() {
  setLanguage(root.dataset.language === "en" ? "zh" : "en");
}

document.querySelector("[data-language-toggle]")?.addEventListener("click", toggleLanguage);

const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 10);
}

function closeMenu({ returnFocus = false } = {}) {
  if (!menuToggle || !mobileMenu) return;
  menuToggle.setAttribute("aria-expanded", "false");
  mobileMenu.hidden = true;
  body.classList.remove("menu-open");
  if (returnFocus) menuToggle.focus();
}

function openMenu() {
  if (!menuToggle || !mobileMenu) return;
  menuToggle.setAttribute("aria-expanded", "true");
  mobileMenu.hidden = false;
  body.classList.add("menu-open");
  mobileMenu.querySelector("a")?.focus();
}

menuToggle?.addEventListener("click", () => {
  if (menuToggle.getAttribute("aria-expanded") === "true") {
    closeMenu({ returnFocus: true });
  } else {
    openMenu();
  }
});

mobileMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => closeMenu());
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && body.classList.contains("menu-open")) {
    closeMenu({ returnFocus: true });
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 900 && body.classList.contains("menu-open")) closeMenu();
});
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const projectFilm = document.querySelector("[data-project-film]");
const chapterButtons = [...document.querySelectorAll("[data-chapter]")];

function setActiveChapter(activeChapter) {
  chapterButtons.forEach((chapter) => {
    const active = chapter === activeChapter;
    chapter.classList.toggle("is-active", active);
    chapter.setAttribute("aria-pressed", String(active));
  });
}

chapterButtons.forEach((chapter) => {
  chapter.setAttribute("aria-pressed", String(chapter.classList.contains("is-active")));
  chapter.addEventListener("click", () => {
    if (!projectFilm) return;
    projectFilm.currentTime = Number(chapter.dataset.time || 0);
    projectFilm.play().catch(() => {});
    setActiveChapter(chapter);
  });
});

projectFilm?.addEventListener("timeupdate", () => {
  const activeChapter = chapterButtons.reduce((current, chapter) => {
    return Number(chapter.dataset.time) <= projectFilm.currentTime ? chapter : current;
  }, chapterButtons[0]);
  if (activeChapter) setActiveChapter(activeChapter);
});

const loopVideos = [...document.querySelectorAll("[data-loop-video]")];
const challengingVideos = [...document.querySelectorAll("#videos > .video-grid--three [data-loop-video]")];
const sampleTabs = [...document.querySelectorAll("[data-sample-tab]")];
const samplePanels = [...document.querySelectorAll("[data-sample-panel]")];
const sampleSection = document.querySelector("#samples");
const samplePlayAll = document.querySelector("[data-sample-play-all]");
const sampleAdvanceDelay = 8000;
let sampleAdvanceTimer;
let samplesInView = false;
let synchronizedVideos = [];
let synchronizationFrame;
let synchronizationGeneration = 0;
let synchronizedPlaybackPending = false;

function videoButton(video) {
  const frame = video.closest(".loop-frame");
  let button = frame?.querySelector("[data-video-toggle]");
  if (!frame || button) return button;
  button = document.createElement("button");
  button.type = "button";
  button.dataset.videoToggle = "";
  const english = document.createElement("span");
  english.className = "lang-en";
  english.textContent = "Play";
  const chinese = document.createElement("span");
  chinese.className = "lang-zh";
  chinese.textContent = "播放";
  button.append(english, chinese);
  frame.append(button);
  return button;
}

function updateVideoButton(video) {
  const button = videoButton(video);
  if (!button) return;
  const paused = video.paused;
  button.setAttribute("aria-label", paused ? "Play video" : "Pause video");
  button.querySelector(".lang-en").textContent = paused ? "Play" : "Pause";
  button.querySelector(".lang-zh").textContent = paused ? "播放" : "暂停";
}

function videoProgress(video) {
  const frame = video.closest(".loop-frame");
  let progress = frame?.querySelector("[data-video-progress]");
  if (!frame || progress) return progress;
  progress = document.createElement("input");
  progress.className = "video-progress";
  progress.type = "range";
  progress.min = "0";
  progress.max = "1000";
  progress.step = "1";
  progress.value = "0";
  progress.dataset.videoProgress = "";
  progress.setAttribute("aria-label", "Video progress");
  frame.append(progress);
  return progress;
}

function updateVideoProgress(video) {
  const progress = videoProgress(video);
  if (!progress) return;
  const fraction = Number.isFinite(video.duration) && video.duration > 0
    ? Math.min(1, Math.max(0, video.currentTime / video.duration))
    : 0;
  progress.value = String(Math.round(fraction * 1000));
  progress.style.setProperty("--video-progress", `${fraction * 100}%`);
}

function activeSamplePanel() {
  return samplePanels.find((panel) => !panel.hidden);
}

function activeSampleVideos() {
  return [...(activeSamplePanel()?.querySelectorAll("video") || [])];
}

function playChallengingVideos() {
  challengingVideos.forEach((video) => {
    video.muted = true;
    video.play().catch(() => {});
  });
}

function pauseNonChallengingVideos(except) {
  loopVideos.forEach((video) => {
    if (video !== except && !challengingVideos.includes(video)) video.pause();
  });
}

function updateSamplePlayAll() {
  if (!samplePlayAll) return;
  const videos = activeSampleVideos();
  const allPlaying = videos.length > 0 && videos.every((video) => !video.paused);
  samplePlayAll.classList.toggle("is-playing", allPlaying);
  samplePlayAll.classList.toggle("is-loading", synchronizedPlaybackPending);
  samplePlayAll.disabled = synchronizedPlaybackPending;
  samplePlayAll.setAttribute("aria-pressed", String(allPlaying));
  samplePlayAll.querySelector(".lang-en").textContent = synchronizedPlaybackPending
    ? "Preparing 8 videos"
    : allPlaying
    ? "Pause all 8 videos"
    : "Play all 8 synchronously";
  samplePlayAll.querySelector(".lang-zh").textContent = synchronizedPlaybackPending
    ? "正在准备 8 个视频"
    : allPlaying
    ? "暂停全部 8 个视频"
    : "同步播放全部 8 个视频";
  const icon = samplePlayAll.querySelector("[data-sample-play-icon]");
  if (icon) icon.textContent = synchronizedPlaybackPending ? "..." : allPlaying ? "Ⅱ" : "▶";
}

function stopSampleAdvance() {
  window.clearTimeout(sampleAdvanceTimer);
  sampleAdvanceTimer = undefined;
  sampleTabs.forEach((tab) => tab.classList.remove("is-auto-counting"));
}

function scheduleSampleAdvance() {
  stopSampleAdvance();
  if (!sampleTabs.length || !samplesInView || document.hidden || synchronizedPlaybackPending || activeSampleVideos().some((video) => !video.paused)) return;
  const activeTab = sampleTabs.find((tab) => tab.classList.contains("is-active"));
  if (activeTab) {
    void activeTab.offsetWidth;
    activeTab.classList.add("is-auto-counting");
  }
  sampleAdvanceTimer = window.setTimeout(() => {
    const activeIndex = Math.max(0, sampleTabs.findIndex((tab) => tab.classList.contains("is-active")));
    const nextTab = sampleTabs[(activeIndex + 1) % sampleTabs.length];
    showSample(nextTab.dataset.sampleTab);
  }, sampleAdvanceDelay);
}

function stopSynchronizedPlayback({ pause = true } = {}) {
  synchronizationGeneration += 1;
  synchronizedPlaybackPending = false;
  window.cancelAnimationFrame(synchronizationFrame);
  const previousVideos = synchronizedVideos;
  synchronizedVideos = [];
  previousVideos.forEach((video) => {
    video.playbackRate = 1;
    if (pause) video.pause();
  });
  updateSamplePlayAll();
}

function videoCanPlayThrough(video) {
  if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) return true;
  if (!Number.isFinite(video.duration) || video.duration <= 0) return false;
  for (let index = 0; index < video.buffered.length; index += 1) {
    if (video.buffered.start(index) <= 0.05 && video.buffered.end(index) >= video.duration - 0.05) return true;
  }
  return false;
}

function prepareSynchronizedVideo(video) {
  video.pause();
  video.preload = "auto";
  if (videoCanPlayThrough(video)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const sources = [...video.querySelectorAll("source")];
    const timeout = window.setTimeout(() => fail(new Error("Video loading timed out")), 30000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("canplaythrough", check);
      video.removeEventListener("progress", check);
      video.removeEventListener("error", fail);
      sources.forEach((source) => source.removeEventListener("error", fail));
    };
    const check = () => {
      if (!videoCanPlayThrough(video)) return;
      cleanup();
      resolve();
    };
    const fail = () => {
      cleanup();
      reject(video.error || new Error("Video could not be loaded"));
    };
    video.addEventListener("canplaythrough", check);
    video.addEventListener("progress", check);
    video.addEventListener("error", fail);
    sources.forEach((source) => source.addEventListener("error", fail));
    video.load();
    check();
  });
}

function resetSynchronizedVideo(video) {
  if (Math.abs(video.currentTime) < 0.001) return Promise.resolve();
  return new Promise((resolve) => {
    video.addEventListener("seeked", resolve, { once: true });
    video.currentTime = 0;
  });
}

function maintainSynchronization() {
  if (!synchronizedVideos.length) return;
  const leader = synchronizedVideos.find((video) => !video.paused);
  if (leader) {
    synchronizedVideos.forEach((video) => {
      if (!video.paused && Math.abs(video.currentTime - leader.currentTime) > 0.045) {
        video.currentTime = leader.currentTime;
      }
    });
  }
  synchronizationFrame = window.requestAnimationFrame(maintainSynchronization);
}

function showSample(key) {
  const previousKey = activeSamplePanel()?.dataset.samplePanel;
  if (previousKey && previousKey !== key) stopSynchronizedPlayback();
  samplePanels.forEach((panel) => {
    const active = panel.dataset.samplePanel === key;
    panel.hidden = !active;
    if (!active) panel.querySelectorAll("video").forEach((video) => video.pause());
  });
  sampleTabs.forEach((tab) => {
    const active = tab.dataset.sampleTab === key;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  updateSamplePlayAll();
  scheduleSampleAdvance();
}

loopVideos.forEach((video) => {
  const isChallengingVideo = challengingVideos.includes(video);
  video.preload = isChallengingVideo ? "auto" : "none";
  video.autoplay = isChallengingVideo;
  const button = videoButton(video);
  const progress = videoProgress(video);
  button?.addEventListener("click", () => {
    if (video.paused) {
      stopSynchronizedPlayback();
      pauseNonChallengingVideos(video);
      projectFilm?.pause();
      video.play().catch(() => {});
    } else {
      video.pause();
    }
    window.setTimeout(() => updateVideoButton(video), 0);
  });
  progress?.addEventListener("input", () => {
    const seek = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      video.currentTime = Number(progress.value) / Number(progress.max) * video.duration;
      updateVideoProgress(video);
    };
    if (Number.isFinite(video.duration)) {
      seek();
    } else {
      video.addEventListener("loadedmetadata", seek, { once: true });
      video.load();
    }
  });
  video.addEventListener("play", () => {
    if (activeSampleVideos().includes(video)) stopSampleAdvance();
    updateVideoButton(video);
    updateSamplePlayAll();
  });
  video.addEventListener("pause", () => {
    updateVideoButton(video);
    updateSamplePlayAll();
    if (!activeSampleVideos().some((activeVideo) => !activeVideo.paused)) scheduleSampleAdvance();
  });
  video.addEventListener("timeupdate", () => updateVideoProgress(video));
  video.addEventListener("durationchange", () => updateVideoProgress(video));
  updateVideoButton(video);
  updateVideoProgress(video);
});
playChallengingVideos();
window.addEventListener("pageshow", playChallengingVideos);

if (sampleTabs.length) {
  sampleTabs.forEach((tab) => {
    tab.setAttribute("role", "tab");
    tab.addEventListener("click", () => showSample(tab.dataset.sampleTab));
  });
  showSample(sampleTabs[0].dataset.sampleTab);
}

if (sampleSection && "IntersectionObserver" in window) {
  const sampleObserver = new IntersectionObserver(([entry]) => {
    samplesInView = entry.isIntersecting;
    if (samplesInView) scheduleSampleAdvance();
    else stopSampleAdvance();
  }, { threshold: 0.12 });
  sampleObserver.observe(sampleSection);
}

samplePlayAll?.addEventListener("click", async () => {
  const videos = activeSampleVideos();
  if (!videos.length) return;
  if (videos.every((video) => !video.paused)) {
    stopSynchronizedPlayback();
    scheduleSampleAdvance();
    return;
  }
  stopSampleAdvance();
  stopSynchronizedPlayback();
  pauseNonChallengingVideos();
  projectFilm?.pause();
  const generation = synchronizationGeneration;
  synchronizedPlaybackPending = true;
  updateSamplePlayAll();
  try {
    await Promise.all(videos.map(prepareSynchronizedVideo));
  } catch (_) {
    if (generation === synchronizationGeneration) stopSynchronizedPlayback();
    return;
  }
  if (generation !== synchronizationGeneration) return;
  await Promise.all(videos.map(resetSynchronizedVideo));
  if (generation !== synchronizationGeneration) return;
  synchronizedVideos = videos;
  synchronizedPlaybackPending = false;
  const playRequests = videos.map((video) => video.play());
  maintainSynchronization();
  updateSamplePlayAll();
  Promise.all(playRequests).catch(() => {
    if (generation === synchronizationGeneration) stopSynchronizedPlayback();
  });
});

projectFilm?.addEventListener("play", () => {
  stopSynchronizedPlayback();
  pauseNonChallengingVideos();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    stopSynchronizedPlayback();
    pauseNonChallengingVideos();
    stopSampleAdvance();
    stopDiversityAdvance();
  } else {
    playChallengingVideos();
    scheduleSampleAdvance();
    scheduleDiversityAdvance();
  }
});

const lightbox = document.querySelector("[data-lightbox]");
const lightboxImage = document.querySelector("[data-lightbox-image]");
let lightboxTrigger = null;

function closeLightbox() {
  if (!lightbox?.open) return;
  lightbox.close();
  body.classList.remove("lightbox-open");
  lightboxTrigger?.focus();
}

document.querySelectorAll("[data-lightbox-src]").forEach((trigger) => {
  trigger.addEventListener("click", () => {
    if (!lightbox || !lightboxImage) return;
    lightboxTrigger = trigger;
    lightboxImage.src = trigger.dataset.lightboxSrc;
    lightboxImage.alt = trigger.dataset.lightboxAlt || "";
    lightbox.showModal();
    body.classList.add("lightbox-open");
  });
});

document.querySelector("[data-lightbox-close]")?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});
lightbox?.addEventListener("close", () => body.classList.remove("lightbox-open"));

const copyButton = document.querySelector("[data-copy-bibtex]");
const copyToast = document.querySelector("[data-copy-toast]");
let toastTimer;

copyButton?.addEventListener("click", async () => {
  const citation = document.querySelector("#bibtex")?.innerText.trim();
  if (!citation) return;
  try {
    await navigator.clipboard.writeText(citation);
  } catch (_) {
    const textarea = document.createElement("textarea");
    textarea.value = citation;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  if (!copyToast) return;
  copyToast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { copyToast.hidden = true; }, 2200);
});

const desktopLinks = [...document.querySelectorAll(".desktop-nav a")];
if ("IntersectionObserver" in window) {
  const sections = [...document.querySelectorAll("main section[id]")];
  const sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    desktopLinks.forEach((link) => link.classList.toggle("is-active", link.hash === `#${visible.target.id}`));
  }, { rootMargin: "-25% 0px -60%", threshold: [0, 0.2, 0.6] });
  sections.forEach((section) => sectionObserver.observe(section));
}
