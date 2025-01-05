"use strict";

const API_KEY = "AIzaSyCq7fDRHYLyo9-ohKbCKOVBGld2Tk";
const startDate = new Date("2021-05-01");
const endDate = new Date();
const timelineContainer = document.querySelector(".timeline");
const videoListContainer = document.createElement("div");
videoListContainer.classList.add("video-list");
document.body.appendChild(videoListContainer);

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const getMonthLabel = (date) => `${monthNames[date.getMonth()]}`;

const months = [];
let currentDate = new Date(startDate);
while (
  currentDate.getFullYear() < endDate.getFullYear() ||
  (currentDate.getFullYear() === endDate.getFullYear() &&
    currentDate.getMonth() <= endDate.getMonth())
) {
  const mm = String(currentDate.getMonth() + 1).padStart(2, "0");
  const yy = String(currentDate.getFullYear()).slice(2);
  months.push(`${mm}/${yy}`);
  currentDate.setMonth(currentDate.getMonth() + 1);
}

const groupedMonths = {};
months.forEach((m) => {
  const [mm, yy] = m.split("/");
  const fullYear = `20${yy}`;
  if (!groupedMonths[fullYear]) {
    groupedMonths[fullYear] = [];
  }
  groupedMonths[fullYear].push(m);
});

const yearSelect = document.querySelector("#yearFilter");
Object.keys(groupedMonths)
  .sort((a, b) => Number(a) - Number(b))
  .forEach((year) => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  });

const monthDivs = {};
let videoFilter = "all";
let searchTerm = "";
let yearFilter = "all";

const syncUrlAndLocalStorage = (month, filter, search, year) => {
  const newUrl = new URL(window.location.href);
  newUrl.searchParams.set("month", month);
  newUrl.searchParams.set("filter", filter);
  newUrl.searchParams.set("search", search);
  newUrl.searchParams.set("year", year);
  window.history.replaceState({}, "", newUrl.toString());
  localStorage.setItem("selectedMonth", month);
  localStorage.setItem("videoFilter", filter);
  localStorage.setItem("searchTerm", search);
  localStorage.setItem("yearFilter", year);
};

const updateMonthStatus = (month, videos) => {
  const div = monthDivs[month];
  if (!div) return;
  const filtered = videos.filter(
    (video) =>
      (videoFilter === "all" || video.type === videoFilter) &&
      video.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  if (!filtered.length) {
    div.classList.remove("bg-green-500");
    div.classList.add("bg-red-500");
  } else {
    div.classList.add("bg-green-500");
    div.classList.remove("bg-red-500");
  }
  const [mm] = month.split("/");
  div.textContent = `${monthNames[Number(mm) - 1]} (${filtered.length})`;
};

const updateTimeline = () => {
  months.forEach((m) => {
    const videos = videoData[m] || [];
    updateMonthStatus(m, videos);
  });
};

const highlightFilterButton = (filter) => {
  const filterButtons = {
    all: document.querySelector("#filterAll"),
    video: document.querySelector("#filterLong"),
    shorts: document.querySelector("#filterShorts"),
    live: document.querySelector("#filterLive"),
  };
  Object.values(filterButtons).forEach((btn) =>
    btn.classList.remove("bg-green-500")
  );
  if (filterButtons[filter]) {
    filterButtons[filter].classList.add("bg-green-500");
  }
};

const applyFilter = (filter) => {
  videoFilter = filter;
  updateTimeline();
  highlightFilterButton(filter);
  const currentMonth = localStorage.getItem("selectedMonth") || "";
  if (currentMonth) {
    const videos = videoData[currentMonth] || [];
    loadVideos(videos, currentMonth);
  }
  syncUrlAndLocalStorage(currentMonth, videoFilter, searchTerm, yearFilter);
};

const loadVideos = async (videos, month) => {
  const filteredByType = videos.filter(
    (video) => videoFilter === "all" || video.type === videoFilter
  );
  const filteredBySearch = filteredByType.filter((video) =>
    video.title.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const videosWithViews = await Promise.all(
    filteredBySearch.map(async (video) => {
      let views = "N/A";
      let publishDate = "N/A";
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${video.id}&key=${API_KEY}`
        );
        const data = await response.json();
        if (data.items && data.items.length > 0) {
          const { statistics, snippet } = data.items[0];
          views = statistics?.viewCount || "N/A";
          publishDate = snippet?.publishedAt || "N/A";
        }
      } catch (error) {}
      return { ...video, views, publishDate };
    })
  );
  const [mm, yy] = month.split("/");
  videoListContainer.innerHTML = `
    <h2 class="text-xl font-semibold mb-4">
      Vídeos em ${monthNames[Number(mm) - 1]} de 20${yy} (${
    filteredBySearch.length
  } ${filteredBySearch.length === 1 ? "vídeo" : "vídeos"})
    </h2>
    ${
      filteredBySearch.length
        ? `
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            ${videosWithViews
              .map((video) => {
                const formattedDate = new Date(
                  video.publishDate
                ).toLocaleDateString();
                return `
                  <div class="video-item flex flex-col items-start">
                    <a href="https://www.youtube.com/watch?v=${video.id}" target="_blank">
                      <img
                        class="w-full h-40 object-cover rounded-lg shadow-md mb-2"
                        src="https://img.youtube.com/vi/${video.id}/hqdefault.jpg"
                        alt="${video.title}"
                      >
                    </a>
                    <div class="text-left w-full">
                      <p class="text-sm font-semibold text-gray-700 mb-1">
                        ${video.title}
                      </p>
                      <p class="text-xs text-gray-500">Publicado em: ${formattedDate}</p>
                      <p class="text-lg font-semibold text-gray-500">
                        Visualizações: ${video.views}
                      </p>
                    </div>
                  </div>
                `;
              })
              .join("")}
          </div>
        `
        : `<p>Nenhum vídeo foi publicado neste mês.</p>`
    }
  `;
};

Object.keys(groupedMonths).forEach((year) => {
  const yearGroup = document.createElement("div");
  yearGroup.classList.add("year-group");
  yearGroup.setAttribute("data-year", year);

  const yearHeader = document.createElement("div");
  yearHeader.classList.add("year-header");

  const yearLabel = document.createElement("h3");
  yearLabel.classList.add("text-left", "text-xl");
  yearLabel.textContent = year;

  yearHeader.appendChild(yearLabel);

  const yearRow = document.createElement("div");
  yearRow.classList.add("year-row");

  groupedMonths[year].forEach((m) => {
    const videos = videoData[m] || [];
    const monthDiv = document.createElement("div");
    monthDivs[m] = monthDiv;
    monthDiv.classList.add(
      "month",
      "cursor-pointer",
      "text-center",
      "rounded-lg",
      "p-2",
      "transition-all",
      "duration-300",
      "hover:scale-105",
      "hover:shadow-md",
      videos.length ? "bg-green-500" : "bg-red-500",
      "text-white"
    );
    const [mm] = m.split("/");
    monthDiv.textContent = `${monthNames[Number(mm) - 1]} (${videos.length})`;
    monthDiv.addEventListener("click", () => {
      loadVideos(videos, m);
      Object.values(monthDivs).forEach((div) =>
        div.classList.remove("selected")
      );
      monthDiv.classList.add("selected");
      syncUrlAndLocalStorage(m, videoFilter, searchTerm, yearFilter);
    });
    yearRow.appendChild(monthDiv);
    updateMonthStatus(m, videos);
  });

  yearGroup.appendChild(yearHeader);
  yearGroup.appendChild(yearRow);

  timelineContainer.appendChild(yearGroup);
});

const urlParams = new URLSearchParams(window.location.search);
const savedMonth =
  urlParams.get("month") || localStorage.getItem("selectedMonth") || "";
const savedFilter =
  urlParams.get("filter") || localStorage.getItem("videoFilter") || "all";
const savedSearch =
  urlParams.get("search") || localStorage.getItem("searchTerm") || "";
const savedYear =
  urlParams.get("year") || localStorage.getItem("yearFilter") || "all";

searchTerm = savedSearch;
if (savedYear !== "all") {
  document.querySelectorAll(".year-group").forEach((group) => {
    if (group.getAttribute("data-year") !== savedYear) {
      group.style.display = "none";
    }
  });
}
yearFilter = savedYear;
yearSelect.value = savedYear;
updateTimeline();
applyFilter(savedFilter);
document.querySelector("#searchInput").value = searchTerm;
if (savedMonth && months.includes(savedMonth)) {
  const div = monthDivs[savedMonth];
  if (div) {
    const videos = videoData[savedMonth] || [];
    loadVideos(videos, savedMonth);
    div.classList.add("selected");
  }
}

document.querySelector("#filterAll").addEventListener("click", () => {
  applyFilter("all");
});
document.querySelector("#filterLong").addEventListener("click", () => {
  applyFilter("video");
});
document.querySelector("#filterShorts").addEventListener("click", () => {
  applyFilter("shorts");
});
document.querySelector("#filterLive").addEventListener("click", () => {
  applyFilter("live");
});

yearSelect.addEventListener("change", () => {
  yearFilter = yearSelect.value;
  document.querySelectorAll(".year-group").forEach((group) => {
    if (yearFilter === "all") {
      group.style.display = "flex";
    } else {
      group.style.display =
        group.getAttribute("data-year") === yearFilter ? "flex" : "none";
    }
  });
  const currentMonth = localStorage.getItem("selectedMonth") || "";
  syncUrlAndLocalStorage(currentMonth, videoFilter, searchTerm, yearFilter);
});

document.querySelector("#searchInput").addEventListener("input", (e) => {
  searchTerm = e.target.value;
  const currentMonth = localStorage.getItem("selectedMonth") || "";
  updateTimeline();
  if (currentMonth) {
    const videos = videoData[currentMonth] || [];
    loadVideos(videos, currentMonth);
  }
  syncUrlAndLocalStorage(currentMonth, videoFilter, searchTerm, yearFilter);
});
