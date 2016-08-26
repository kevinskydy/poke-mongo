// Add JSON support to Storage
if (Storage) {
  Storage.prototype.setObject = function(key, value) {
    this.setItem(key, JSON.stringify(value));
  }
  Storage.prototype.getObject = function(key) {
    return JSON.parse(this.getItem(key));
  }
}

$(function () {
  var isDev = (window.location.protocol == "file:"),
      pokemonsURL = isDev ? "https://docs.google.com/spreadsheets/d/1CabMVyCj9xDv79qzNK5NmCIVC2Rw_yN7Kg4SwiGRXAQ/pub?output=csv&gid=0" : "data/pokemons.csv",
      fastMovesURL = isDev ? "https://docs.google.com/spreadsheets/d/1TsKNAbRh7CBw6yRLadkOEEf5UqYA0g2rlMBDKbNB0h4/pub?output=csv&gid=1436234182" : "data/fastMoves.csv",
      chargedMovesURL = isDev ? "https://docs.google.com/spreadsheets/d/1TsKNAbRh7CBw6yRLadkOEEf5UqYA0g2rlMBDKbNB0h4/pub?output=csv&gid=1493616609" : "data/chargedMoves.csv",
      typesURL = isDev ? "https://docs.google.com/spreadsheets/d/1CabMVyCj9xDv79qzNK5NmCIVC2Rw_yN7Kg4SwiGRXAQ/pub?output=csv&gid=1451102056" : "data/typesChart.csv",
      dustCPURL = isDev ? "https://docs.google.com/spreadsheets/d/1CabMVyCj9xDv79qzNK5NmCIVC2Rw_yN7Kg4SwiGRXAQ/pub?output=csv&gid=90070008" : "data/cpDust.csv",
      pokedex = {},
      fastMoves = {},
      chargedMoves = {},
      typeChart = {}, // [attackingType][defendingType]
      dustMultipliers = {} //<?!= getDustMultipliers(); ?>,
      levelMultipliers = {},
      STAB_MULTIPLIER = 1.25,
      CHARGE_TIME = 1.0,
      THEMES = {
        Valor: {
          bg: "red",
          text: "red-text",
          logo: "pokeball"
        },
        Mystic: {
          bg: "blue darken-2",
          text: "blue-text text-darken-2",
          logo: "greatball"
        },
        Instinct: {
          bg: "yellow darken-2",
          text: "yellow-text text-darken-3",
          logo: "ultraball"
        }
      },
      bindListeners = function() {
        var calculate = function () {
              var name = $("#your-pokemon").val().trim().toLowerCase(),
                  pokemon = pokedex[name],
                  $results = $("#results tbody"),
                  $modals = $("#modal-moves"),
                  movesets;
            },
            createTypeChip = function (type) {
              return ['<div class="chip white-text type-', type.toLowerCase(), '">', type, "</div>"].join("");
            },
            createMoveModals = function (pokemon) {
              var $container = $("#modal-moves");

              for (var i in pokemon.chargedMoves) {
                var m = pokemon.chargedMoves[i],
                    modalId = "modal-move-" + m.name.replace(" ", "-");

                if ($("#" + modalId).length) {
                  continue;
                }

                $container.append([
                  "<div id='", modalId, "' class='modal bottom-sheet'>",
                    "<div class='modal-content'>",
                      "<h5 class='teal-text'>", m.name, "</h5>",
                      "<table>",
                        "<thead>",
                          "<th>Type</th>",
                          "<th>Damage</th>",
                          "<th>Energy Cost</th>",
                          "<th>Execution Time</th>",
                        "</thead>",
                        "<tbody>",
                          "<tr>",
                            "<td>", createTypeChip(m.type), "</td>",
                            "<td>", m.damage, "</td>",
                            "<td>", Math.abs(m.energyGain), "</td>",
                            "<td>", m.executionTime, "</td>",
                          "</tr>",
                        "</tbody>",
                      "</table>",
                    "</div>",
                  "</div>"
                ].join(""));
              }

              for (var i in pokemon.fastMoves) {
                var m = pokemon.fastMoves[i],
                    modalId = "modal-move-" + m.name.replace(" ", "-");

                $container.append([
                  "<div id='", modalId, "' class='modal bottom-sheet'>",
                    "<div class='modal-content'>",
                      "<h5 class='teal-text'>", m.name, "</h5>",
                      "<table>",
                        "<thead>",
                          "<th>Type</th>",
                          "<th>Damage</th>",
                          "<th>Energy Gain</th>",
                          "<th>Execution Time</th>",
                        "</thead>",
                        "<tbody>",
                          "<tr>",
                            "<td>", createTypeChip(m.type), "</td>",
                            "<td>", m.damage, "</td>",
                            "<td>", m.energyGain, "</td>",
                            "<td>", m.executionTime, "</td>",
                          "</tr>",
                        "</tbody>",
                      "</table>",
                    "</div>",
                  "</div>"
                ].join(""));
              }
            },
            createMovesetRow = function (moveset) {
              var cModalID = "modal-move-" + moveset.chargedMove.name.replace(" ", "-"),
                  fModalID = "modal-move-" + moveset.fastMove.name.replace(" ", "-");

              return [
                "<tr>",
                  "<td><a class='modal-trigger' href='#", fModalID, "'>", moveset.fastMove.name, "</td>",
                  "<td><a class='modal-trigger' href='#", cModalID, "'>", moveset.chargedMove.name, "</a></td>",
                  "<td>", moveset.totalExecutionTime.toFixed(2), "</td>",
                  "<td>", moveset.totalDamageDealt.toFixed(2), "</td>",
                  "<td style='font-weight:bold;'>", moveset.comboDPS.toFixed(2), "</td>",
                  "<td>", moveset.fastOnlyDamage.toFixed(2), "</td>",
                  "<td style='font-weight:bold;'>", moveset.fastDPS.toFixed(2), "</td>",
                "</tr>"
              ].join("");
            },
            updatePokemonInfo = function ($container, pokemon) {
              $container.find(".name").html(pokemon.name);
              $container.find(".types").html(pokemon.types.map(createTypeChip).join(" "));
              $container.find(".attack").html(pokemon.attack);
              $container.find(".defense").html(pokemon.defense);
              $container.find(".stamina").html(pokemon.stamina);
              $container.find(".fast-moves").html(pokemon.fastMoves.map(function (m) {
                return "<a class='modal-trigger' href='#modal-move-" + m.name.replace(" ", "-") + "'>" + m.name + "</a>";
              }).join(",<br>"));
              $container.find(".charged-moves").html(pokemon.chargedMoves.map(function (m) {
                return "<a class='modal-trigger' href='#modal-move-" + m.name.replace(" ", "-") + "'>" + m.name + "</a>";
              }).join(",<br>"));

              return [
                "<tr>",
                  "<td></td>",
                "</tr>"
              ].join();
            };

        $('input[type="text"], input[type="number"]').on("focus", function (e) {
          $(this).select();
        });

        $("#your-pokemon-form").submit(function (e) {
          e.preventDefault();

          var name = $("#your-pokemon").val().trim().toLowerCase(),
              pokemon = pokedex[name],
              enemyName = $("#enemy-pokemon").val().trim().toLowerCase(),
              enemyPokemon = pokedex[enemyName],
              $movesets = $("#movesets"),
              $movesetsAtk = $("#movesets-attacking"),
              $enemyMovesets = $("#enemy-movesets"),
              $enemyMovesetsAtk = $("#enemy-movesets-attacking"),
              $modals = $("#modal-moves"),
              movesets;

          $(".has-match").hide();

          if (!name) {
            return;
          }

          if (!pokemon) {
            Materialize.toast("Failed to catch " + name.slice(0,1).toUpperCase() + name.slice(1) + ".", 4000);
            return;
          }

          $(".has-enemy-match").hide(); // will eventually show this if there is indeed an enemy
          $modals.empty();

          createMoveModals(pokemon);
          updatePokemonInfo($("#your-pokemon-details"), pokemon);

          movesets = pokemon.calculateMovesets();
          $movesets.find(".name").html(pokemon.name);
          $movesets.find("tbody").empty();

          for (var i in movesets) {
            var moveset = movesets[i];

            $movesets.find("tbody").append(createMovesetRow(moveset));
          }

          $(".has-match").show();

          if (!enemyName) {
            $(".modal-trigger").leanModal({
              dismissable: true
            });
            ga(function (tracker) {
              tracker.send("event", "movesets", pokemon.name);
            });
            return;
          }

          if (!enemyPokemon) {
            Materialize.toast("Failed to engage wild " + name.slice(0,1).toUpperCase() + name.slice(1) + ".", 4000);
            $(".modal-trigger").leanModal({
              dismissable: true
            });
            ga(function (tracker) {
              tracker.send("event", "movesets", pokemon.name);
            });
            return;
          }

          createMoveModals(enemyPokemon);
          updatePokemonInfo($("#enemy-pokemon-details"), enemyPokemon);

          movesets = pokemon.calculateMovesets(enemyPokemon);
          $movesetsAtk.find(".name").html(pokemon.name);
          $movesetsAtk.find(".enemy-name").html(enemyPokemon.name);
          $movesetsAtk.find("tbody").empty();

          for (var i in movesets) {
            var moveset = movesets[i];

            $movesetsAtk.find("tbody").append(createMovesetRow(moveset));
          }

          movesets = enemyPokemon.calculateMovesets();
          $enemyMovesets.find(".enemy-name").html(enemyPokemon.name);
          $enemyMovesets.find("tbody").empty();

          for (var i in movesets) {
            var moveset = movesets[i];

            $enemyMovesets.find("tbody").append(createMovesetRow(moveset));
          }

          movesets = enemyPokemon.calculateMovesets(pokemon);
          $enemyMovesetsAtk.find(".enemy-name").html(enemyPokemon.name);
          $enemyMovesetsAtk.find(".name").html(pokemon.name);
          $enemyMovesetsAtk.find("tbody").empty();

          for (var i in movesets) {
            var moveset = movesets[i];

            $enemyMovesetsAtk.find("tbody").append(createMovesetRow(moveset));
          }

          $(".has-enemy-match").show();

          ga(function (tracker) {
            tracker.send("event", "movesets", pokemon.name, enemyPokemon.name);
          });

          $(".modal-trigger").leanModal({
            dismissable: true
          });
        });

        $("#add-member-form").submit(function (e) {
          e.preventDefault();

          var name = $("#member-pokemon").val().trim().toLowerCase(),
              pokemon = pokedex[name],
              cp = $("#member-cp").val().trim(),
              hp = $("#member-hp").val().trim(),
              dust = $("#member-dust").val().trim(),
              powered = $("#member-powered").prop("checked"),
              matches;

          if (!name) {
            return;
          }

          if (!pokemon) {
            Materialize.toast("Failed to catch " + name + ".", 4000);
          }

          matches = calculateIV(pokemon, cp, hp, dust, powered);

          if (!matches.length) {
            Materialize.toast("Could not calculate IVs for " + pokemon.name, 4000);
            return;
          }

          ga(function (tracker) {
            tracker.send("event", "myTeam", "ivMatch", pokemon.name);
          });

          var key = getKey(pokemon, cp, hp, dust, powered);

          updateLocal(key, [pokemon.name, cp, hp, dust, powered]);
          createMember(key, [[pokemon.name, cp, hp, dust, powered]]);

          Materialize.toast("Added " + pokemon.name + " to team.", 2000);
//          $("#member-pokemon").focus();
        });

        $("#refresh-team").click(function (e) {
          $("#my-team-list").empty();
          loadMyTeam();
        });

        $("#clear-my-team").click(function (e) {
          localStorage["myTeam"] = "{}";
          $("#my-team-list").empty();
          $("#modal-clear-team").closeModal();
        });

        $("#remove-member").click(function (e) {
          var key = $(this).attr("data-remove-member"),
              $li = $('#my-team-list li[data-local-key="' + key + '"]');

          $("#remove-member").attr("data-remove-member", '');

          removeFromLocal(key);
          $li.remove();

          $("#modal-remove-member").closeModal();
        });

        $("#my-team-list").on("click", ".remove", function (e) {
          e.preventDefault();

          var $li = $(this).closest("li"),
              key = $li.attr("data-local-key"),
              myTeam = localStorage.getObject("myTeam"),
              data = myTeam[key];

          $("#modal-remove-member .pokemon").text(data[data.length-1][0]);
          $("#remove-member").attr("data-remove-member", key);
          $("#modal-remove-member").openModal();

          return;


          removeFromLocal(key);
          $li.remove();
        });

        $("#my-team-list").on("click", ".view-iv", function (e) {
          e.preventDefault();

          var myTeam = localStorage.getObject("myTeam"),
              $li = $(this).closest("li"),
              key = $li.attr("data-local-key"),
              data = myTeam[key],
              pokemon,
              matches;

          for (var i in data) {
            pokemon = pokedex[data[i][0].toLowerCase()];
            matches = calculateIV(pokemon, data[i][1], data[i][2], data[i][3], data[i][4], matches);
          }

          $("#modal-iv-list tbody").empty();
          $("#modal-iv-list .pokemon").text(pokemon.name);
          $("#modal-iv-list .total").text(matches.length);

          matches.sort(function (a, b) { return b.perfect- a.perfect; });
          matches = matches.slice(0, 20)

          $("#modal-iv-list .displayed").text(matches.length);
          for (var i in matches) {
            var m = matches[i];

            $("#modal-iv-list tbody").append([
              "<tr>",
                "<td>", m.level, "</td>",
                "<td>", m.attack, "</td>",
                "<td>", m.defense, "</td>",
                "<td>", m.stamina, "</td>",
                "<td>", (m.perfect * 100.0).toFixed(1), "</td>",
              "</tr>"
            ].join(""));
          }

          $("#modal-iv-list").openModal();
        });
      },
      loadFastMoves = function () {
        var callback = function (data, status, jqxhr) {
          data = data.split("\n"); // <?!= getFastMoves(); ?>;
          data = data.slice(1);

          for (var i in data) {
            var parts = data[i].split(",");
            fastMoves[parts[1].trim()] = {
              name: parts[1].trim(),
              type: parts[2].trim(),
              executionTime: parseFloat(parts[5]) / 1000.0,
              damage: parseInt(parts[3]),
              energyGain: parseInt(parts[7]),
              getDPS: function () { this.damage / this.executionTime },
              getEPS: function () { this.energyGain / this.executionTime },
              getPokemonDamage: function (pokemon, enemyPokemon) {
                var damage = pokemon.types.indexOf(this.type) >= 0 ? this.damage * STAB_MULTIPLIER : this.damage;

                if (enemyPokemon) {
                  for (var i in enemyPokemon.types) {
                    damage *= typeChart[this.type][enemyPokemon.types[i]];
                  }
                }

                return damage;
              },
              getPokemonDPS: function (pokemon, enemyPokemon) {
                return this.getPokemonDamage(pokemon, enemyPokemon) / this.executionTime;
              }
            };
          }

          loadChargedMoves();
        };

        $.get(fastMovesURL, callback);
      },
      loadChargedMoves = function () {
        var callback = function (data, status, jqxhr) {
          data = data.split("\n"); // <?!= getChargedMoves(); ?>;
          data = data.slice(1);

          for (var i in data) {
            var parts = data[i].split(",");
            chargedMoves[parts[1].trim()] = {
              name: parts[1].trim(),
              type: parts[2].trim(),
              executionTime: parseFloat(parts[6]) / 1000.0,
              damage: parseInt(parts[3]),
              energyGain: parseInt(parts[9]),
              criticalChance: parseFloat(parts[8]),
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
        };

        $.get(chargedMovesURL, callback);
      },
      loadPokemons = function () {
        var callback = function (data, status, jqxhr) {
          data = data.split("\n"); // <?!= getPokemons(); ?>;
          data = data.slice(1);

          for (var i in data) {
            var parts = data[i].split(",");

            pokedex[parts[0].trim().toLowerCase()] = {
              number: parseInt(i)+1,
              name: parts[0].trim(),
              types: parts[1].trim().split("|"),
              fastMoves: parts[2].trim().split("|").map(function (f, i, arr) { return fastMoves[f]; }),
              chargedMoves: parts[3].trim().split("|").map(function (c, i, arr) { return chargedMoves[c]; }),
              attack: parseInt(parts[4]),
              defense: parseInt(parts[5]),
              stamina: parseInt(parts[6]),
              evolvesFrom: parts[7].trim() ? parts[7].trim().split("|") : [],
              evolvesTo: parts[8].trim() ? parts[8].trim().split("|") : [],
              calculateMovesets: function (enemy) {
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

                    totalDamageDealt = (f.getPokemonDamage(this, enemy) * fastTurns) + c.getPokemonDamage(this, enemy);
                    totalExecutionTime = (f.executionTime * fastTurns) + c.executionTime + CHARGE_TIME;
                    comboDPS = totalDamageDealt / totalExecutionTime;

                    fastDPS = f.getPokemonDPS(this, enemy);
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
              getCP: function (level, atkIV, defIV, staIV) {
                var s = Math.pow(this.stamina + staIV, 0.5),
                    a = this.attack + atkIV,
                    d = Math.pow(this.defense + defIV, 0.5),
                    cpSq = Math.pow(levelMultipliers[level], 2),
                    cpCheck = parseInt(Math.floor(cpSq * s * a * d / 10.0));

                return cpCheck;
              },
              getHP: function (level, staIV) {
                var cpMulti = levelMultipliers[level],
                    hpCheck = parseInt(Math.floor((this.stamina + staIV) * cpMulti));

                return hpCheck;
              }
            };
          }

          loadMyTeam();
          bindListeners();
        };

        $.get(pokemonsURL, callback);
      },
      loadTypes = function () {
        var $typesTable = $("#tab-types table"),
            $trDefHead = $typesTable.find("thead tr:last"),
            $tbody = $typesTable.find("tbody"),
            callback = function (data, status, jqxhr) {
              // var data = [[], []] // <?!= getTypeChart(); ?>,
              var types;

              data = data.split("\n");
              types = data[1].split(",");
              data = data.slice(2);

              for (var i = 0; i < types.length; i++) {
                $trDefHead.append("<th class='center-align " + ((i == 0) ? "orange lighten-2" : "cyan lighten-3") + "'>" + types[i] + "</th>");
              }

              types = types.slice(1);

              for (var atk = 0; atk < data.length; atk++) {
                var row = data[atk].split(","),
                    atkType = row[0].trim(),
                    markup = ["<tr>",
                      "<td class='right-align orange lighten-3' style='font-weight: bold;'>",
                        atkType,
                      "</td>"
                    ].join("");

                typeChart[atkType] = {}; // initialize typeChart for atk type

                for (var def = 0; def < types.length; def++) {
                  var defType = types[def].trim(),
                      dmgMultiplier = row[def+1].trim();

                  markup += [
                    "<td class='center-align ", (dmgMultiplier ? (parseFloat(dmgMultiplier) > 1.0 ? "green lighten-3": "red lighten-3"): ""), "'>",
                      dmgMultiplier,
                    "</td>"
                  ].join("");

                  typeChart[atkType][defType] = (dmgMultiplier ? parseFloat(dmgMultiplier) : 1.0); // set multiplier value

                }

                markup += "</tr>"
                $tbody.append(markup);
              }

              loadFastMoves();
            };

        $.get(typesURL, callback);
      },
      loadDustMultipliers = function () {
        var callback = function (data, status, jqxhr) {
          var cpMultipliers = data.split("\n").slice(1),
              dustLevels = cpMultipliers.slice(0,20);

          for (var i in dustLevels) {
            var dParts = dustLevels[i].split(",").slice(2);

            dustMultipliers[dParts[0]] = [];
            for (var j = 0; j < 4; j++) { // 4 powerups before new level
              var index = (i * 4) + j,
                  cpPair = cpMultipliers[index].split(",").slice(0,2),
                  level = parseFloat(cpPair[0]),
                  multiplier = parseFloat(cpPair[1]);

              dustMultipliers[dParts[0]].push([level, multiplier]);
              levelMultipliers[level] = multiplier;
            }
          }

          loadTypes();
        };

        $.get(dustCPURL, callback);
      },

      // My Team Helpers
      padZeroes = function (n) {
        return Array(4 - n.toString().length).join("0") + n.toString();
      },
      updateLocal = function (key, obj) {
        var myTeam = localStorage.getObject("myTeam");

        if (!(key in myTeam)) {
          myTeam[key] = [];
        }

        myTeam[key].push(obj);

        localStorage.setObject("myTeam", myTeam);
      },
      removeFromLocal = function (key) {
        var myTeam = localStorage.getObject("myTeam");
        if (key in myTeam) {
          delete myTeam[key];
        }

        localStorage.setObject("myTeam", myTeam);
      },
      getKey = function (pokemon) {
        var myTeam = localStorage.getObject("myTeam"),
            paddedNum = padZeroes(pokemon.number),
            pk = 1;
        while ((paddedNum + "-" + pk) in myTeam) {
          pk++;
        }
        return paddedNum + "-" + pk;
      },
      createUpdateOptions = function (p) {
        var options = "<option value='" + p.name.toLowerCase() + "' selected>" + p.name + "</option>";

        for (var i in p.evolvesTo) {
          options += "<option value='" + p.evolvesTo[i].toLowerCase() + "'>" + p.evolvesTo[i] + "</option>";
        }

        return options;
      },
      createUpdateFormDetails = function (pokemon, cp, hp, dust, powered) {
        var $tr = $([
          "<tr>",
            "<td>",
            "<select class='center-align' name='pokemon'>",
            createUpdateOptions(pokemon),
            "</select>",
            "</td>",
            "<td><input name='cp' type='number' min=", cp, " required class='center-align'></td>",
            "<td><input name='hp' type='number' min=", hp, " required class='center-align'></td>",
            "<td><input name='dust' type='number' min=", dust, " required max=10000 step=100 class='center-align'></td>",
            "<td>",
              "<input type='checkbox' name='powered' style='display:none;' checked>",
              "<i class='material-icons teal-text'>check</i>",
              "<i class='material-icons red-text' style='display:none;'>clear</i>",
            "</td>",
            "<td><button class='btn waves-effect waves-light' type='submit' name='action'>Update</button></td>",
          "</tr>"
        ].join(""));

        return $tr;
      },
      createMemberRow = function (pokemon, cp, hp, dust, powered, matches) {
        var minPerf = 1.0,
            maxPerf = 0.0,
            perfString = "";

        if (matches.length != 1) {
          for (var i in matches) {
            var m = matches[i];

            minPerf = m.perfect < minPerf ? m.perfect : minPerf;
            maxPerf = m.perfect > maxPerf ? m.perfect : maxPerf;
          }

          perfString = (minPerf*100.0).toFixed(1) + " - " + (maxPerf*100.0).toFixed(1);
        }
        else {
          perfString = (matches[0].perfect * 100.0).toFixed(1);
        }

        return $([
          "<tr>",
            "<td>", pokemon.name, "</td>",
            "<td>", cp, "</td>",
            "<td>", hp, "</td>",
            "<td>", dust, "</td>",
            "<td><i class='material-icons ", (powered ? "teal-text'>check": "red-text'>clear"), "</i></td>",
            "<td>", perfString, "%</td>",
          "</tr>"
        ].join(""));
      },
      updateListener = function (e) {
        e.preventDefault();

        var $select = $(this).find('select[name="pokemon"]'),
            $tr = $select.closest("tr"),
            $tbody = $tr.closest("tbody"),
            $li = $tbody.closest("li"),
            key = $li.attr("data-local-key"),
            pokemonHistory = localStorage.getObject("myTeam")[key],
            name = $select.val(),
            pokemon = pokedex[name],
            cp = $(this).find('input[name="cp"]').val(),
            hp = $(this).find('input[name="hp"]').val(),
            dust = $(this).find('input[name="dust"]').val(),
            powered = $(this).find('input[name="powered"]').prop("checked"),
            matches;

        for (var i in pokemonHistory) {
          var _ph = pokemonHistory[i],
              _pokemon = pokedex[_ph[0].toLowerCase()],
              _cp = _ph[1],
              _hp = _ph[2],
              _dust = _ph[3],
              _powered = _ph[4];
          matches = calculateIV(_pokemon, _cp, _hp, _dust, _powered, matches);
        }

        matches = calculateIV(pokemon, cp, hp, dust, powered, matches);

        var minPerf = 1.0,
            maxPerf = 0.0;

        for (var i in matches) {
          var m = matches[i];

          minPerf = m.perfect < minPerf ? m.perfect : minPerf;
          maxPerf = m.perfect > maxPerf ? m.perfect : maxPerf;
        }

        if (!matches.length) {
          Materialize.toast("Failed to calculate IVs for " + pokemon.name + ".", 4000);
          return;
        }

        ga(function (tracker) {
          tracker.send("event", "myTeam", "ivUpdate", pokemon.name);
        });

        var myTeam = localStorage.getObject("myTeam"),
            testKey = getKey(pokemon);

        if (testKey.split("-")[0] != key.split("-")[0]) {
          var tempData = myTeam[key];
          delete myTeam[key];
          myTeam[testKey] = tempData;
          key = testKey;
          $li.attr("data-local-key", testKey)

          localStorage.setObject("myTeam", myTeam);
        }

        updateLocal(key, [pokemon.name, cp, hp, dust, powered]);

        $li.find(".member-detail.name").text(pokemon.name);
        $li.find(".member-detail.cp").text("CP " + cp);
        $li.find(".member-detail.hp").text("HP " + hp);
        $tr.remove();
        $tbody.append(createMemberRow(pokemon, cp, hp, dust, powered, matches));

        if (matches.length == 1) {
          $li.find(".badge").text((matches[0].perfect * 100.0).toFixed(1) + "%");
        }
        else {
          $tbody.append(createUpdateFormDetails(pokemon, cp, hp, dust, powered));
          $li.find(".badge").text((minPerf * 100.0).toFixed(1) + " - " + (maxPerf * 100.0).toFixed(1) + "%");
          $tbody.find("select").material_select();
          $tbody.find("select").change(createUpdateSelectListener(pokemon, powered));
        }
      },
      createUpdateSelectListener = function (pokemon, powered) {
        return function (e) {
          var val = $(this).val(),
              name = pokemon.name.toLowerCase(),
              $poweredIconCheck = $(this).closest("tr").find('i.teal-text'),
              $poweredIconClear = $(this).closest("tr").find('i.red-text'),
              $poweredInput = $(this).closest("tr").find('input[name="powered"]');

          if (powered) {
            return;
          }

          if (name == val) {
            $poweredIconCheck.show();
            $poweredIconClear.hide();
            $poweredInput.prop('checked', true)
          }
          else {
            $poweredIconCheck.hide();
            $poweredIconClear.show();
            $poweredInput.prop('checked', false)
          }
        };
      },
      createMember = function (key, data) {
        if (!data.length) return;

        var matches,
            lastRow = data[data.length-1],
            $rows = [],
            $node,
            $updateForm,
            selectListener;

        for (var i in data) {
          var row = data[i],
              pokemon = pokedex[row[0].toLowerCase()],
              cp = row[1],
              hp = row[2],
              dust = row[3],
              powered = row[4];

          matches = calculateIV(pokemon, cp, hp, dust, powered, matches);
          $rows.push(createMemberRow(pokemon, cp, hp, dust, powered, matches));

          if (i ==  data.length-1) {
            // console.log(pokemon.name,
            //   pokemon.getCP(matches[0].level, matches[0].attack, matches[0].defense, matches[0].stamina),
            //   pokemon.getHP(matches[0].level, matches[0].stamina));
            var minPerf = 1.0,
                maxPerf = 0.0,
                perfString = "";

            if (matches.length != 1) {
              for (var i in matches) {
                var m = matches[i];

                minPerf = m.perfect < minPerf ? m.perfect : minPerf;
                maxPerf = m.perfect > maxPerf ? m.perfect : maxPerf;
              }

              perfString = (minPerf*100.0).toFixed(1) + " - " + (maxPerf*100.0).toFixed(1);
            }
            else {
              perfString = (matches[0].perfect * 100.0).toFixed(1);
            }

            $node = $([
              "<li data-local-key='", key, "'>",
                "<div class='collapsible-header collection-item'>",
                  "<div class='member-detail name'>", pokemon.name, "</div>",
                  "<div class='member-detail cp'>CP ", cp, "</div>",
                  //"<div class='member-detail hp'>HP ", hp, "</div>",
                  "<span class='badge' data-badge-caption=''>", perfString, "%</span>",
                "</div>",
                "<div class='collapsible-body'>",
                  "<a class='waves-effect waves-light btn blue right view-iv'>View IV</a>",
                  "<a class='waves-effect waves-light btn red right remove'><i class='material-icons white-text left'>clear</i>Remove</a>",
                  "<form class='update-form'>",
                    "<table class='centered'>",
                      "<thead>",
                        "<tr>",
                          "<th></th>",
                          "<th>CP</th>",
                          "<th>HP</th>",
                          "<th>Dust</th>",
                          "<th>Pwrd?</th>",
                          "<th>IV % Perfect</th>",
                        "</tr>",
                      "</thead>",
                      "<tbody>",
                      "</tbody>",
                    "</table>",
                  "</form>",
                "</div>",
              "</li>"
            ].join(""));

            if (matches.length != 1) {
              $rows.push(createUpdateFormDetails(pokemon, cp, hp, dust, powered));
            }
            selectListener = createUpdateSelectListener(pokemon, powered);
          }
        }

        $rows.forEach(function ($row) { $node.find("tbody").append($row); });

        $("#my-team-list").prepend($node);
        $node.find("select").material_select();
        $node.find("select").change(selectListener);
        $node.find("form").submit(updateListener);
      },
      loadMyTeam = function () {
        var myTeam = localStorage.getObject("myTeam"),
            keys = Object.keys(myTeam);

        keys.sort();
        keys.reverse();

        for (var i in keys) {
          var k = keys[i],
              data = myTeam[k];

          createMember(k, data);
        }
      },

      calculateIV = function (pokemon, cp, hp, dust, powered, filterSet) {
        var multipliers = dustMultipliers[dust],
            matches = [];

        if (!powered) {
          multipliers = [multipliers[0], multipliers[2]];
        }

        for (var i in multipliers) {
          var cpMulti = multipliers[i][1],
              level = multipliers[i][0],
              cpSq = Math.pow(cpMulti, 2);

          for (var _s = 0; _s < 16; _s++) {
            var s = Math.pow(pokemon.stamina + _s, 0.5),
                hpCheck = parseInt(Math.floor((pokemon.stamina + _s) * cpMulti));

            if ((hp == 10 && hpCheck <= hp) || (hp > 10 && hpCheck == hp)) {

              for (var _a = 0; _a < 16; _a++) {
                var a = pokemon.attack + _a;
                for (var _d = 0; _d < 16; _d++) {
                  var d = Math.pow(pokemon.defense + _d, 0.5),
                      cpCheck = parseInt(Math.floor(cpSq * s * a * d / 10));

                  if ((cp == 10 && cpCheck <= cp) || (cp > 10 && cpCheck == cp)) {
                    matches.push({
                      level: level,
                      stamina: _s,
                      attack: _a,
                      defense: _d,
                      perfect: (_s + _a + _d) / 45.0,
                      short: (_a << 8 | _d << 4 | _s)
                    });
                  }
                }
              }
            }
          }
        }

        if (matches.length && filterSet && filterSet.length) {
          var filteredMatches = [];
          filterSet.forEach(function (f) {
            matches.forEach(function (m) {
              f.short == m.short && filteredMatches.push(m);
            });
          });
          return filteredMatches;
        }

        return matches;
      },

      initialize = function () {
        // Themes
        var savedTheme = localStorage.getItem("team_theme"),
            swipables = document.getElementsByTagName("body")[0],
            swipers = new Hammer(window);

        swipers.on("swipeleft", function (e) {
          var $next = $(".tabs-wrapper .tab a.active").closest(".tab").next();

          // console.log($next.length);

          if ($next.length) {
            $next.find("a").click();
          }
        });

        swipers.on("swiperight", function (e) {
          var $next = $(".tabs-wrapper .tab a.active").closest(".tab").prev();

          // console.log($next.length);

          if ($next.length) {
            $next.find("a").click();
          }
        });

        $("#tab-types > div").bind("touchstart", function (e) {
          if ($(this).scrollLeft() > 0) {
            e.stopPropagation();
          }
        })

        $('input[name="team-theme"]').change(function (e) {
          var val = $(this).val(),
              theme = THEMES[val];

          if (!theme) {
            return;
          }

          $(".themeable, .tabs .indicator").removeClass("red blue yellow darken-2");
          $(".themeable-text").removeClass("red-text blue-text yellow-text text-darken-2 text-darken-3");
          $(".brand-logo span").removeClass("pokeball greatball ultraball");

          $(".themeable, .tabs .indicator").addClass(theme.bg);
          $(".themeable-text").addClass(theme.text);
          $(".brand-logo span").addClass(theme.logo);

          localStorage.setItem("team_theme", val);
        });

        // PUSHPIN on tabs
        $('.tabs-fixed .tabs-wrapper').pushpin({ top: $('.tabs-wrapper').offset().top});
        // rebinding pushpin fixes snapping one responsive screens
        $(window).resize(function (e) {
          $('.tabs-fixed .tabs-wrapper').pushpin("remove");
          $('.tabs-fixed .tabs-wrapper').pushpin({ top: $('.tabs-wrapper').offset().top});
        });

        $(".button-collapse").sideNav({
          edge: "right",
          closeOnClick: true
        });
        $(".drag-target, #mobile-menu").bind("touchstart", function (e) { e.stopPropagation(); });
        $('ul.tabs').tabs({onShow: function (active) {
          var $prev = $(".active-tab"),
              $curr = $(active),
              prevTabIdx = $(".tab-bodies > .col").index($prev),
              currTabIdx = $(".tab-bodies > .col").index($curr);

          // console.log(prevTabIdx, currTabIdx);

          $prev.removeClass('active-tab tabinfromright tabinfromleft');
          $curr.removeClass("tabouttoleft tabouttoright");
          if (currTabIdx > prevTabIdx) {
            $curr.addClass("tabinfromright active-tab");
            $prev.addClass("tabouttoleft");
          }
          else if (currTabIdx < prevTabIdx) {
            $curr.addClass("tabinfromleft active-tab");
            $prev.addClass("tabouttoright");
          }

        }});
        $('select').material_select();
        $('.modal-trigger').leanModal({ dismissable: true });

        if (savedTheme) {
          $('input[value="' + savedTheme + '"]').prop("checked", true);
          $('input[value="' + savedTheme + '"]').change();
        }

        /*$(".button-collapse").sideNav({
          edge: "right",
          closeOnClick: true
        });*/
        loadDustMultipliers();
        ;
        $(".state-loading").hide();
      };

  if (!localStorage.myTeam) {
    localStorage.setObject("myTeam", {});
  }

  initialize();
});
