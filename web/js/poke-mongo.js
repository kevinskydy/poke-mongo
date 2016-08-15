$(function () {
  var pokemonsURL = "data/pokemons.csv",
  // var pokemonsURL = "https://docs.google.com/spreadsheets/d/1CabMVyCj9xDv79qzNK5NmCIVC2Rw_yN7Kg4SwiGRXAQ/pub?output=csv",
      fastMovesURL = "data/fastMoves.csv",
      // fastMovesURL = "https://docs.google.com/spreadsheets/d/1TsKNAbRh7CBw6yRLadkOEEf5UqYA0g2rlMBDKbNB0h4/pub?output=csv&gid=1436234182",
      chargedMovesURL = "data/chargedMoves.csv",
      // chargedMovesURL = "https://docs.google.com/spreadsheets/d/1TsKNAbRh7CBw6yRLadkOEEf5UqYA0g2rlMBDKbNB0h4/pub?output=csv&gid=1493616609",
      pokedex = {},
      fastMoves = {},
      chargedMoves = {},
      STAB_MULTIPLIER = 1.25,
      CHARGE_TIME = 1.0,
      onDataLoaded = function() {
        $("#moveset_form").submit(function (event) {
          event.preventDefault();

          var name = $("#pokemon_name").val().trim().toLowerCase(),
              pokemon = pokedex[name],
              $results = $("#results tbody"),
              $modals = $("#modal-container"),
              movesets;

          if (!name) {
            return;
          }

          $(".container").addClass("loading");

          if (!pokemon) {
            Materialize.toast("Failed to catch " + name.slice(0,1).toUpperCase() + name.slice(1) + ".", 4000);
            $(".container").removeClass("loading");
            return;
          }

          $("#pokemon-details .name").html(pokemon.name);
          $("#pokemon-details .types").html(pokemon.types.join(",<br>"));
          $("#pokemon-details .attack").html(pokemon.attack);
          $("#pokemon-details .defense").html(pokemon.defense);
          $("#pokemon-details .stamina").html(pokemon.stamina);
          $("#pokemon-details .fast-moves").html(pokemon.fastMoves.map(function (m) {
            return "<a class='modal-trigger' href='#modal-f-" + m.name.replace(" ", "-") + "'>" + m.name + "</a>";
          }).join(",<br>"));
          $("#pokemon-details .charged-moves").html(pokemon.chargedMoves.map(function (m) {
            return "<a class='modal-trigger' href='#modal-c-" + m.name.replace(" ", "-") + "'>" + m.name + "</a>";
          }).join(",<br>"));

          movesets = pokemon.calculateMovesets()

          $results.empty();
          $modals.empty();

          if (!movesets.length) {
            Materialize.toast("Failed to calculate movesets.", 4000);
            $(".container").addClass("loading");
            return;
          }

          for (var i in movesets) {
            var moveset = movesets[i],
                cModalID = moveset.chargedMove.name.replace(" ", "-"),
                fModalID = moveset.fastMove.name.replace(" ", "-");

            $results.append(
              "<tr>" +
                "<td><a class='modal-trigger' href='#modal-f-" + fModalID + "'>" + moveset.fastMove.name + "</td>" +
                "<td><a class='modal-trigger' href='#modal-c-" + cModalID + "'>" + moveset.chargedMove.name + "</a></td>" +
                "<td>" + moveset.totalExecutionTime.toFixed(2) + "</td>" +
                "<td>" + moveset.totalDamageDealt.toFixed(2) + "</td>" +
                "<td style='font-weight:bold;'>" + moveset.comboDPS.toFixed(2) + "</td>" +
                "<td>" + moveset.fastOnlyDamage.toFixed(2) + "</td>" +
                "<td style='font-weight:bold;'>" + moveset.fastDPS.toFixed(2) + "</td>" +
              "</tr>"
            );
          }

          for (var i in pokemon.chargedMoves) {
            var m = pokemon.chargedMoves[i];

            $modals.append(
              "<div id='modal-c-" + m.name.replace(" ", "-") + "' class='modal bottom-sheet'>" +
                "<div class='modal-content'>" +
                  "<h4 class='teal-text'>" + m.name + "</h4>" +
                  "<table>" +
                    "<thead>" +
                      "<th>Type</th>" +
                      "<th>Damage</th>" +
                      "<th>Energy Cost</th>" +
                      "<th>Execution Time</th>" +
                    "</thead>" +
                    "<tbody>" +
                      "<tr>" +
                        "<td>" + m.type + "</td>" +
                        "<td>" + m.damage + "</td>" +
                        "<td>" + Math.abs(m.energyGain) + "</td>" +
                        "<td>" + m.executionTime + "</td>" +
                      "</tr>" +
                    "</tbody>" +
                  "</table>" +
                "</div>" +
                "<div class='modal-footer'>" +
                  "<a href='#!' class='modal-action modal-close waves-effect waves-light btn-flat red lighten-1 white-text'>Close</a>" +
                "</div>" +
              "</div>"
            );
          }

          for (var i in pokemon.fastMoves) {
            var m = pokemon.fastMoves[i];

            $modals.append(
              "<div id='modal-f-" + m.name.replace(" ", "-") + "' class='modal bottom-sheet'>" +
                "<div class='modal-content'>" +
                  "<h4 class='teal-text'>" + m.name + "</h4>" +
                  "<table>" +
                    "<thead>" +
                      "<th>Type</th>" +
                      "<th>Damage</th>" +
                      "<th>Energy Gain</th>" +
                      "<th>Execution Time</th>" +
                    "</thead>" +
                    "<tbody>" +
                      "<tr>" +
                        "<td>" + m.type + "</td>" +
                        "<td>" + m.damage + "</td>" +
                        "<td>" + m.energyGain + "</td>" +
                        "<td>" + m.executionTime + "</td>" +
                      "</tr>" +
                    "</tbody>" +
                  "</table>" +
                "</div>" +
                "<div class='modal-footer'>" +
                  "<a href='#!' class='modal-action modal-close waves-effect waves-light btn-flat red lighten-1 white-text'>Close</a>" +
                "</div>" +
              "</div>"
            );
          }

          $(".modal-trigger").leanModal({
            dismissable: true
          });

          $(".container").removeClass("loading");
        });

        $(".container").removeClass("loading");
      },
      loadFastMoves = function () {
        $.get(fastMovesURL, function (data, status, jqxhr) {
          var lines = (data + "\n").split("\n");

          for (var i = 1, parts = lines[i].split(",");
               i < lines.length-1;
               i++, parts = lines[i].split(",")) {
            fastMoves[parts[1].trim()] = {
              name: parts[1].trim(),
              type: parts[2].trim(),
              executionTime: parseInt(parts[5].trim()) / 1000.0,
              damage: parseInt(parts[3].trim()),
              energyGain: parts[7].trim(),
              getDPS: function () { this.damage / this.executionTime },
              getEPS: function () { this.energyGain / this.executionTime },
              getPokemonDamage: function (pokemon) {
                return pokemon.types.indexOf(this.type) >= 0 ? this.damage * STAB_MULTIPLIER : this.damage;
              },
              getPokemonDPS: function (pokemon) {
                return this.getPokemonDamage(pokemon) / this.executionTime;
              }
            };
          }
          loadChargedMoves();
        });
      },
      loadChargedMoves = function () {
        $.get(chargedMovesURL, function (data, status, jqxhr) {
          var lines = (data + "\n").split("\n");

          for (var i = 1, parts = lines[i].split(",");
               i < lines.length-1;
               i++, parts = lines[i].split(",")) {
            chargedMoves[parts[1].trim()] = {
              name: parts[1].trim(),
              type: parts[2].trim(),
              executionTime: parseInt(parts[6].trim()) / 1000.0,
              damage: parseInt(parts[3].trim()),
              energyGain: parts[9].trim(),
              criticalChance: parseFloat(parts[8].trim()) / 100.0,
              getDPS: function () { this.damage / this.executionTime },
              getEPS: function () { this.energyGain / this.executionTime },
              getPokemonDamage: function (pokemon) {
                return pokemon.types.indexOf(this.type) >= 0 ? this.damage * STAB_MULTIPLIER : this.damage;
              },
              getPokemonDPS: function (pokemon) {
                return this.getPokemonDamage(pokemon) / this.executionTime;
              }
            };
          }
          loadPokemons();
        });
      },
      loadPokemons = function () {
        $.get(pokemonsURL, function (data, status, jqxhr) {
          var lines = (data + "\n").split("\n");

          for (var i = 1, parts = lines[i].split(",");
               i < lines.length-1;
               i++, parts = lines[i].split(",")) {

            pokedex[parts[0].trim().toLowerCase()] = {
              name: parts[0].trim(),
              types: parts[1].trim().split("|"),
              fastMoves: parts[2].trim().split("|").map(function (f, i, arr) { return fastMoves[f]; }),
              chargedMoves: parts[3].trim().split("|").map(function (c, i, arr) { return chargedMoves[c]; }),
              attack: parseInt(parts[4].trim()),
              defense: parseInt(parts[5].trim()),
              stamina: parseInt(parts[6].trim()),
              evolvesFrom: parts[7].trim().toLowerCase(),
              calculateMovesets: function () {
                var movesets = [],
                    comparator = function (a, b) {
                      return a.comboDPS - b.comboDPS;
                    };
                for (var i in this.fastMoves) {
                  f = this.fastMoves[i];
                  for (var j in this.chargedMoves) {
                    c = this.chargedMoves[j];

                    energyCost = parseFloat(Math.abs(c.energyGain));
                    fastTurns = energyCost / parseFloat(f.energyGain);

                    totalDamageDealt = (f.getPokemonDamage(this) * fastTurns) + c.getPokemonDamage(this);
                    totalExecutionTime = (f.executionTime * fastTurns) + c.executionTime + CHARGE_TIME;
                    comboDPS = totalDamageDealt / totalExecutionTime;

                    fastDPS = f.getPokemonDPS(this);
                    fastOnlyDamage = fastDPS * totalExecutionTime;

                    moveset = {
                      fastMove: f,
                      chargedMove: c,
                      fastTurns: fastTurns,
                      totalExecutionTime: totalExecutionTime,
                      totalDamageDealt: totalDamageDealt,
                      comboDPS: comboDPS,
                      fastOnlyDamage: fastOnlyDamage,
                      fastDPS: fastDPS
                    };

                    movesets.push(moveset);
                  }
                }

                movesets.sort(comparator);
                movesets.reverse();

                return movesets
              },
            };
          }
          onDataLoaded();
        });
      };
  $(".container").addClass("loading");
  $(".button-collapse").sideNav({
    edge: "right",
    closeOnClick: true
  });
  loadFastMoves()
});
