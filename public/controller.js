const columns = 4;
const maxArtists = 36;
const spotifyArtistSearchBase =
"https://api.spotify.com/v1/search?type=artist&limit=1&q="
const spotifyArtistBase =
"https://api.spotify.com/v1/artists/"
const preferredArtworkSize = 500
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
  $scope.hasPlayedPreviews = false;

  // We attempt to avoid showing the same artist twice.
  var seenArtists = [];

  /* Seed the tree with an artist, adding an initial row. */
  $scope.seedTree = function() {
    if ($scope.seed.length == 0) {
      var randIndex = Math.floor(Math.random() * sampleSeeds.length);
      $scope.seed = sampleSeeds[randIndex];
    }

    $scope.grid = [];
    addRowFromArtistName($scope.seed);
  };

  /* Toggle currently selected artist, adding new a row if necessary. */
  $scope.selectArtist = function(r, c) {
    $scope.grid.splice(r + 1, $scope.grid.length - r - 1);
    if (!$scope.grid[r][c].selected){
      addRowFromArtistName($scope.grid[r][c].name);
    }

    $scope.grid[r][c].selected = !$scope.grid[r][c].selected
    for (var i = 0; i < columns; ++i) {
      if (i != c) {
        $scope.grid[r][i].selected = false;
      }
    }
  }

  /* Add a new row to the grid using the Spotify Web API. */
  function addRowFromArtistName(artist) {
    $scope.infoText = "Loading...";
    $scope.infoTextType = "info";
    var url = spotifyArtistSearchBase + artist.replace('&', ' ');

    $http.get(url).then(
      function success(response) {
        if (response.data.artists.total == 0) {
          $scope.infoText = "Artist not found";
          $scope.infoTextType = "danger";
        } else {
          addRowFromArtistInfo(response.data.artists.items[0]);
        }
      },

      function error(response) {
        $scope.infoText = "Error searching for artist";
        $scope.infoTextType = "danger";
      }
    );
  }

  /* Add a new row to the grid given an artist info JSON object. */
  function addRowFromArtistInfo(artistInfo) {
    var url = spotifyArtistBase + artistInfo.id + "/related-artists";

    $http.get(url).then(
      function success(response) {
        if (response.data.artists.length < columns) {
          $scope.infoText = "Not enough related artists found";
          $scope.infoTextType = "danger";
          return;
        }

        $scope.infoText = null;
        var r = $scope.grid.length;
        $scope.grid[r] = [];

        var candidates = response.data.artists;

        // Filter out artists already seen.
        var i = 0;
        while (candidates.length >= columns && i < candidates.length) {
          if (seenArtists[candidates[i].name])
            candidates.splice(i, 1);
          else ++i;
        }

        for (var c = 0; c < columns; ++c) {
          $scope.grid[r][c] = {
            name: candidates[c].name,
            id: candidates[c].id,
            image: chooseArtistImage(candidates[c].images),
            tracks: null,
            previewIndex: 0,
            artistLink: candidates[c].external_urls.spotify,
            selected: false
          }

          getSongPreview(r, c, candidates[c].id);
          seenArtists[candidates[c].name] = true;
        }
      },

      function error(data) {
        $scope.infoText = "Error retrieving similar artists";
        $scope.infoTextType = "danger";
      }
    );
  }

  /* Choose artist image based on size. */
  function chooseArtistImage(images) {
    if (images.length == 0) {
      return "placeholder-artwork.png";
    } else {
      // Return a medium size image if possible.
      var bestImage = images[0].url;
      var bestDelta = Math.abs(images[0].width - preferredArtworkSize);
      for (var i = 1; i < images.length; ++i) {
        var delta = Math.abs(images[i].width - preferredArtworkSize);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestImage = images[i].url;
        }
      }
      return bestImage;
    }
  }

  /* Get song previews from Spotify. */
  function getSongPreview(r, c, id) {
    var url = spotifyArtistBase + id + "/top-tracks?country=US";

    $http.get(url).then(
      function success(response) {
        if (r >= $scope.grid.length || $scope.grid[r][c].id != id) {
          // This http response is out of date.
        } else if (response.data.tracks.length > 0) {
          $scope.grid[r][c].tracks = response.data.tracks;
        }
      },

      function error(response) {
        $scope.infoText = "Error retrieving song previews";
        $scope.infoTextType = "danger";
      }
    );
  }

  /* Return true if the given artist is currently playing. */
  $scope.playing = function(artistData) {
    if (audio.paused || artistData.tracks == null) {
      return false;
    }
    for (var i = 0; i < artistData.tracks.length; ++i) {
      if (audio.src == artistData.tracks[i].preview_url) {
        return true;
      }
    }
    return false;
  }

  /* Play or pause a song preview. */
  $scope.playPreview = function(artistData) {
    if (artistData.tracks == null) {
      $scope.infoText = "No audio preview available for that artist";
      $scope.infoTextType = "danger";
      $scope.currentlyPlayingText = null;
    } else if ($scope.playing(artistData)) {
      $scope.infoText = null;
      $scope.currentlyPlayingText = null;
      audio.pause();
    } else {
      var artist = artistData.name;
      var track  = artistData.tracks[artistData.previewIndex];
      $scope.currentlyPlayingText =
          " (Currently playing \"" + track.name + "\" by " + artist + ".)";
      audio.src = track.preview_url;
      audio.play();
      $scope.hasPlayedPreviews = true;
    }
  }

  $scope.playNextTrack = function(artistData) {
    audio.pause();
    artistData.previewIndex =
        (artistData.previewIndex + 1) % artistData.tracks.length;
    $scope.playPreview(artistData);
  }
});
