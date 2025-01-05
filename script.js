"use strict";

const API_KEY = "AIzaSyCq7fWviBfDRHYLyo9-ohKbCKOVBGld2Tk";
const startDate = new Date("2021-05-01");
const endDate = new Date();
const timelineContainer = document.querySelector(".timeline");
const videoListContainer = document.createElement("div");
videoListContainer.classList.add("video-list");
document.body.appendChild(videoListContainer);

const formatDate = (date) =>
  `${String(date.getMonth() + 1).padStart(2, "0")}/${String(
    date.getFullYear()
  ).slice(2)}`;

const months = [];
let currentDate = new Date(startDate);
while (
  currentDate.getFullYear() < endDate.getFullYear() ||
  (currentDate.getFullYear() === endDate.getFullYear() &&
    currentDate.getMonth() <= endDate.getMonth())
) {
  months.push(formatDate(currentDate));
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

let videoFilter = "all";

const loadVideos = async (videos, month) => {
  const filteredVideos = videos.filter(
    (video) => videoFilter === "all" || video.type === videoFilter
  );
  const videosWithViews = await Promise.all(
    filteredVideos.map(async (video) => {
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
      } catch (error) {
        console.error("Erro ao buscar dados do vídeo", error);
      }
      return { ...video, views, publishDate };
    })
  );
  videoListContainer.innerHTML = `
    <h2 class="text-xl font-semibold mb-4">
      Vídeos em ${month} (${filteredVideos.length} ${
    filteredVideos.length === 1 ? "vídeo" : "vídeos"
  })
    </h2>
    ${
      filteredVideos.length
        ? `
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            ${videosWithViews
              .map((video) => {
                const formattedPublishDate = new Date(
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
                      <p class="text-sm font-semibold text-gray-700 mb-1">${video.title}</p>
                      <p class="text-xs text-gray-500">Publicado em: ${formattedPublishDate}</p>
                      <p class="text-lg font-semibold text-gray-500">Visualizações: ${video.views}</p>
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

const syncUrlAndLocalStorage = (month, filter) => {
  window.history.replaceState({}, "", `?month=${month}&filter=${filter}`);
  localStorage.setItem("selectedMonth", month);
  localStorage.setItem("videoFilter", filter);
};

const monthDivs = {};

const updateMonthStatus = (month, videos) => {
  const div = monthDivs[month];
  if (!div) return;
  const filteredVideos = videos.filter(
    (video) => videoFilter === "all" || video.type === videoFilter
  );
  if (filteredVideos.length === 0) {
    div.classList.remove("bg-green-500");
    div.classList.add("bg-red-500");
  } else {
    div.classList.add("bg-green-500");
    div.classList.remove("bg-red-500");
  }
  div.textContent = `${month} (${filteredVideos.length})`;
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
  const selectedMonth = localStorage.getItem("selectedMonth");
  if (selectedMonth) {
    const videos = videoData[selectedMonth] || [];
    loadVideos(videos, selectedMonth);
  }
  syncUrlAndLocalStorage(selectedMonth || "", filter);
};

Object.keys(groupedMonths).forEach((year) => {
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
    monthDiv.textContent = `${m} (${videos.length})`;
    monthDiv.addEventListener("click", () => {
      loadVideos(videos, m);
      Object.values(monthDivs).forEach((div) =>
        div.classList.remove("selected")
      );
      monthDiv.classList.add("selected");
      syncUrlAndLocalStorage(m, videoFilter);
    });
    yearRow.appendChild(monthDiv);
    updateMonthStatus(m, videos);
  });

  timelineContainer.appendChild(yearRow);
});

const urlParams = new URLSearchParams(window.location.search);
const selectedMonth =
  urlParams.get("month") || localStorage.getItem("selectedMonth");
const selectedFilter =
  urlParams.get("filter") || localStorage.getItem("videoFilter") || "all";

if (selectedFilter) {
  applyFilter(selectedFilter);
} else {
  highlightFilterButton("all");
}

if (selectedMonth && months.includes(selectedMonth)) {
  const div = monthDivs[selectedMonth];
  if (div) {
    const videos = videoData[selectedMonth] || [];
    loadVideos(videos, selectedMonth);
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
