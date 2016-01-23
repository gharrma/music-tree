const columns = 4;
const maxArtists = 36;
// Echo Nest API keys are rate limited, so don't use mine; get your own
// for free at http://developer.echonest.com/docs
const echoNestBase =
"http://developer.echonest.com/api/v4/artist/similar?api_key=NRYQRCDBN0YCG4AO7"
+ "&results=" + maxArtists + "&min_results=" + columns + "&name=";
const iTunesBase =
"http://itunes.apple.com/search?media=music&limit=1\
&attribute=artistTerm&entity=song&callback=JSON_CALLBACK&term="
const artworkSuffix = "300x300bb.jpg";
const audio = new Audio();
const sampleSeeds = [
  "The Head and the Heart", "Ben Folds", "The Barr Brothers", "Radiohead",
  "The Lumineers", "Bon Iver", "Sufjan Stevens", "Of Monsters and Men",
  "Mumford & Sons", "Death Cab for Cutie", "The Black Keys", "Beirut"
];

/* Main controller. */
var app = angular.module("MusicTree", []);
app.controller("MusicTreeController", function($scope, $http) {
  $scope.seed = "";
  $scope.infoText = null;
  $scope.infoTextType = "info";
  $scope.colWidth = 12 / columns;

  /* Seed tree with entered artist, adding initial row. */
  $scope.seedTree = function() {
    if ($scope.seed.length == 0) {
      var randIndex = Math.floor(Math.random() * sampleSeeds.length);
      $scope.seed = sampleSeeds[randIndex];
    }

    $scope.grid = [];
    addRow($scope.seed);
  };

  /* Toggle currently selected artist, adding new row if necessary. */
  $scope.selectArtist = function(r, c) {
    $scope.grid.splice(r + 1, $scope.grid.length - r - 1);
    if (!$scope.grid[r][c].selected){
      addRow($scope.grid[r][c].name);
    }

    $scope.grid[r][c].selected = !$scope.grid[r][c].selected
    for (var i = 0; i < columns; i++) {
      if (i != c) {
        $scope.grid[r][i].selected = false;
      }
    }
  }

  /* Add new row to grid using Echo Nest API. */
  var seenArtists = [];
  function addRow(artist) {
    $scope.infoText = "Loading...";
    $scope.infoTextType = "info";

    function success(data) {
      var status = data.response.status.code;
      var candidates = data.response.artists;

      if (status != 0) {
        $scope.infoText = "Artist not found";
        $scope.infoTextType = "danger";
        return;
      }

      $scope.infoText = null;
      var r = $scope.grid.length;
      $scope.grid[r] = [];

      // filter out artists already seen
      var i = 0;
      while (candidates.length >= columns && i < candidates.length) {
        if (seenArtists[candidates[i].name])
          candidates.splice(i, 1);
        else i++;
      }

      for (var c = 0; c < columns; c++) {
        $scope.grid[r][c] = {
          name: candidates[c].name,
          image: "placeholder-artwork.png",
          preview: null,
          previewTitle: "unavailable",
          previewLink: null,
          selected: false
        }

        getSongPreviews(r, c);
        seenArtists[candidates[c].name] = true;
      }

      window.scrollTo(0, document.body.scrollHeight);
    }

    function error(data) {
      $scope.infoText = "Error retrieving artist data";
      $scope.infoTextType = "danger";
    }

    var url = echoNestBase + artist.replace('&', ' ');
    $http.get(url).success(success).error(error);
  }

  /* Get song previews and artwork from iTunes. */
  function getSongPreviews(r, c) {
    function success(data) {
      if (data.resultCount == 0)
        return;

      $scope.infoText = null;
      var imageURL = data.results[0].artworkUrl100
        .replace("100x100bb.jpg", artworkSuffix);
      $scope.grid[r][c].image = imageURL;
      $scope.grid[r][c].preview = data.results[0].previewUrl;
      $scope.grid[r][c].previewTitle = '"' + data.results[0].trackName + '"';
      $scope.grid[r][c].previewLink = data.results[0].trackViewUrl;
    }

    function error(data) {
      $scope.infoText = "Error retrieving artwork and song previews";
      $scope.infoTextType = "danger";
    }

    var url = iTunesBase + $scope.grid[r][c].name.replace('&', ' ');
    $http.jsonp(url).success(success).error(error);
  }

  /* Returns true if the given audio URL is currently playing */
  $scope.playing = function(previewURL) {
    return !audio.paused && audio.src == previewURL;
  }

  /* Play or pause a song preview. */
  $scope.playPreview = function(previewURL) {
    if (previewURL == null) {
      $scope.infoText = "No audio preview available for that artist";
      $scope.infoTextType = "danger";
    } else if ($scope.playing(previewURL)) {
      $scope.infoText = null;
      audio.pause();
    } else {
      audio.src = previewURL;
      audio.play();
    }
  }
});
