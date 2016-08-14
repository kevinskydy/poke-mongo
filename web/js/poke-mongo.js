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

          var pokemon = pokedex[$("#pokemon_name").val().trim().toLowerCase()],
              $results = $("#results tbody"),
              movesets;

          $("#results").hide();
          $("#loading_empty").hide();
          $("#loading_movesets").show();

          if (!pokemon) {
            $("#loading_movesets").hide();
            $("#loading_empty").show();
            return;
          }

          movesets = pokemon.calculateMovesets()

          $results.empty();
          if (!movesets.length) {
            $("#loading_movesets").hide();
            $("#loading_empty").show();
            return;
          }

          for (var i in movesets) {
            var moveset = movesets[i];

            $results.append(
              "<tr>" +
                "<td>" + moveset.fastMove.name + "</td>" +
                "<td>" + moveset.chargedMove.name + "</td>" +
                "<td>" + moveset.totalExecutionTime.toFixed(2) + "</td>" +
                "<td>" + moveset.totalDamageDealt.toFixed(2) + "</td>" +
                "<td style='font-weight:bold;'>" + moveset.comboDPS.toFixed(2) + "</td>" +
                "<td>" + moveset.fastOnlyDamage.toFixed(2) + "</td>" +
                "<td style='font-weight:bold;'>" + moveset.fastDPS.toFixed(2) + "</td>" +
              "</tr>"
            );
          }

          $("#loading_movesets").hide();
          $("#results").show();
        });

        $("#loading_movesets").hide();
        $("#loading_empty").show();
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
                // console.log(pokemon.types, this.type, pokemon.types.indexOf(this.type) >= 0);
                return pokemon.types.indexOf(this.Type) >= 0 ? this.damage * STAB_MULTIPLIER : this.damage;
              },
              getPokemonDPS: function (pokemon) {
                return this.getPokemonDamage(pokemon) / this.executionTime;
              }
            };
          }
          // fastMoves["Thunder Shock"].getPokemonDamage(pokedex["pikachu"]);
          onDataLoaded();
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
                // console.log(this.name, pokemon.types, this.type, pokemon.types.indexOf(this.type) >= 0);
                return pokemon.types.indexOf(this.Type) >= 0 ? this.damage * STAB_MULTIPLIER : this.damage;
              },
              getPokemonDPS: function (pokemon) {
                return this.getPokemonDamage(pokemon) / this.executionTime;
              }
            };
          }
          // chargedMoves["Thunder"].getPokemonDamage(pokedex["pikachu"]);
          loadFastMoves();
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
              fastMoves: parts[2].trim().split("|"),
              chargedMoves: parts[3].trim().split("|"),
              attack: parseInt(parts[4].trim()),
              defense: parseInt(parts[5].trim()),
              stamina: parseInt(parts[6].trim()),
              calculateMovesets: function () {
                var movesets = [],
                    comparator = function (a, b) {
                      return a.comboDPS - b.comboDPS;
                    };
                for (var i in this.fastMoves) {
                  f = fastMoves[this.fastMoves[i]];
                  for (var j in this.chargedMoves) {
                    c = chargedMoves[this.chargedMoves[j]];

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
          loadChargedMoves();
        });
      };
  loadPokemons();
});
