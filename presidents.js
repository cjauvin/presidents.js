/*
   presidents.js -- A game of Presidents (a card game, a.k.a. Asshole, or Trou-de-cul
                    in French) in pure JS, with a simple but efficient AI

   Created by Christian Jauvin <cjauvin@gmail.com>
   May 2010

   To install: just unzip the "images" folder, and serve.

   Notes:

   * Some parts of the UI are in French, but it should be very easy to change

   * The rules are based on a version of the game played in Quebec (i.e. they could
     be quite different than yours)

   * Thanks to the creator of the free Function Icon Set:
     http://wefunction.com/2008/07/function-free-icon-set
*/

var img_path = './images';

// Firebug detection
if (typeof console === 'undefined') {
    console = {log: function() { return false; }};
}

// String formatting
String.prototype.format = function() {
    var pattern = /\{\d+\}/g;
    var args = arguments;
    return this.replace(pattern, function(capture){ return args[capture.match(/\d+/)]; });
};

function fisherYatesShuffling(arr) {
  var i = arr.length;
  if (i == 0) return false;
  while ( --i ) {
     var j = Math.floor(Math.random() * (i + 1));
     var tempi = arr[i];
     var tempj = arr[j];
     arr[i] = tempj;
     arr[j] = tempi;
   }
};

var presidents = presidents || (function() {

    // UI
    // card size reduced to 75%
    var CARD_IMG_WIDTH_PX = '56px';//'75px';
    var CARD_IMG_HEIGHT_PX = '80px';//'107px';
    var HORIZONTAL_CARD_SPACER = 22;
    var VERTICAL_CARD_SPACER = 18;
    var CARD_MOVE_SPEED = 20;
    var END_OF_CARD_MOVE_DELAY = 1000; // delay in msec
    var END_OF_TURN_DELAY = 2000;
    var SHORT_ANIM_DELAY = 500;
    var AI_SKIP_ANIM_DELAY = 1000;
    var CENTER_CARD_PILE_POS = [250, 225];

    // Card sets
    var ALL = 0;
    var SIMPLES = 1;
    var DOUBLES = 2;
    var TRIPLES = 3;
    var QUADS = 4;
    var TWOS = 5;
    var JOKERS = 6;

    // AI play style params

    var AI_FIRST_PLAY_TDC_RANK_THRESHOLD = 8;
    var AI_STRONG_PLAY_TDC_RANK_THRESHOLD = 10;
    var AI_NEAR_END_N_CARDS_THRESHOLD = 4;
    var AI_N_CARDS_BELOW_AVG_MARGIN = 2;

    // debug stuff
    var show_all_cards = false;

    return {

        Presidents: function(anchor_div) {

            var assert = function(b, msg) {
                if (!b) { console.log(msg); }
            };

            var tdc_div = jQuery('<div />').appendTo(jQuery('#' + anchor_div));

            tdc_div.css({
                width: '650px',
                height: '600px',
                background: 'darkgreen',
                border: '1px solid black',
                position: 'relative'
            });

            var rank_infos = [];
            var rank_infos_pos = [['5px', '5px'], ['500px', '5px'], ['520px', '470px'], ['5px', '470px']];
            var rank_infos_imgs = ['president.png', 'vice-president.png', 'secretaire.png', 'trou-de-cul.png'];
            var rank_play_icons = [];
            var rank_play_icons_imgs = [['arrow_down_48.png', 'arrow_down_green_48.png'], ['arrow_left_48.png', 'arrow_left_green_48.png'],
                                        ['arrow_up_48.png', 'arrow_up_green_48.png'], ['arrow_right_48.png', 'arrow_right_green_48.png']];
            var rank_play_icons_pos = [['250px', '100px'], ['475px', '275px'], ['300px', '425px'], ['90px', '275px']];
            var rank_star_icon_pos = [['90px', '100px'], ['460px', '100px'], ['460px', '425px'], ['90px', '425px']];
            var rank_next_rank_icons = [];
            var rank_next_rank_icons_imgs = ['president2.png', 'vice-president2.png', 'secretaire2.png', 'trou-de-cul2.png'];
            var rank_next_rank_icons_pos = [['100px', '25px'], ['520px', '135px'], ['440px', '485px'], ['35px', '400px']];
            var rank_next_rank_icons_dims = [['48px', '48px'], ['72px', '48px'], ['48px', '48px'], ['72px', '48px']];

            for (var i = 0; i < 4; i++) {

                rank_infos[i] = jQuery('<div />').appendTo(tdc_div);
                rank_infos[i].css({
                    position: 'absolute',
                    left: rank_infos_pos[i][0],
                    top: rank_infos_pos[i][1]
                });

                var rank_infos_img = jQuery('<img />').appendTo(rank_infos[i]);
                rank_infos_img.attr({
                    src: '{0}/{1}'.format(img_path, rank_infos_imgs[i])
                });

                rank_infos_name = jQuery('<div />').appendTo(rank_infos[i]);
                rank_infos_name.css({
                    'font-variant': 'small-caps',
                    color: 'yellow'
                });
                rank_infos[i].name = rank_infos_name;

                rank_infos_stats = jQuery('<div />').appendTo(rank_infos[i]);
                rank_infos_stats.css({
                    'font-variant': 'small-caps',
                    color: 'yellow'
                });
                rank_infos[i].stats = rank_infos_stats;

                rank_play_icons[i] = jQuery('<div />').appendTo(tdc_div);
                rank_play_icons[i].css({
                    position: 'absolute',
                    left: rank_play_icons_pos[i][0],
                    top: rank_play_icons_pos[i][1],
                    'background-image': 'url({0}/function_icon_set/{1})'.format(img_path, rank_play_icons_imgs[i][0]),
                    width: '48px',
                    height: '48px',
                    visibility: 'hidden'
                });
                rank_play_icons[i].arrow_img_url = 'url({0}/function_icon_set/{1})'.format(img_path, rank_play_icons_imgs[i][0]);
                rank_play_icons[i].arrow_highlight_img_url = 'url({0}/function_icon_set/{1})'.format(img_path, rank_play_icons_imgs[i][1]);
                rank_play_icons[i].cross_img_url = 'url({0}/function_icon_set/cross_48.png)'.format(img_path);
                rank_play_icons[i].warning_img_url = 'url({0}/function_icon_set/warning_48.png)'.format(img_path);

                rank_next_rank_icons[i] = jQuery('<div />').appendTo(tdc_div);
                rank_next_rank_icons[i].css({
                    position: 'absolute',
                    left: rank_next_rank_icons_pos[i][0],
                    top: rank_next_rank_icons_pos[i][1],
                    'background-image': 'url({0}/{1})'.format(img_path, rank_next_rank_icons_imgs[i]),
                    width: rank_next_rank_icons_dims[i][0],
                    height: rank_next_rank_icons_dims[i][1],
                    visibility: 'hidden'
                });

            }

            var star_icon = jQuery('<div />').appendTo(tdc_div);
            star_icon.css({
                position: 'absolute',
                'background-image': 'url({0}/function_icon_set/star_48.png)'.format(img_path),
                width: '48px',
                height: '48px',
                visibility: 'hidden'
            });

            var loading_div = jQuery('<div>Chargement...</div>').appendTo(tdc_div);
            loading_div.css({
                color: 'orange',
                position: 'absolute',
                left: '300px',
                top: '275px',
                visibility: 'visible'
            });

            var new_btn = jQuery('<div />').appendTo(tdc_div);
            new_btn.css({
                position: 'absolute',
                left: '300px',
                top: '275px',
                width: '48px',
                height: '48px',
                'background-image': 'url({0}/function_icon_set/circle_orange.png)'.format(img_path),
                visibility: 'hidden'
            });
            new_btn.bind('mouseover', function() {
                new_btn.css('background-image', 'url({0}/function_icon_set/circle_green.png)'.format(img_path));
            });
            new_btn.bind('mouseout', function() {
                new_btn.css('background-image', 'url({0}/function_icon_set/circle_orange.png)'.format(img_path));
            });

            // create card object, which is a div with 2 sub-divs: img and selection mask
            // and a bunch of other stuff (value, suit, functions that apply to individual card, etc.)

            var n_card_images_loaded = 0;

            var createCard = function(value, suit, tdc_rank, joker) {

                var card = jQuery('<div />');
                card.value = value;
                card.suit = suit;
                card.tdc_rank = tdc_rank; // Card rank in terms of TDC rules (3=low, joker=high)
                card.is_joker = (joker != null);
                card.is_selectable = true;
                card.side = 'front' // or 'back'

                card.css('position', 'absolute');

                // front/back card image
                var img_div = jQuery('<div />').appendTo(card);
                // little hack to make sure that all the card images are loaded before the new play btn is showed
                var img = jQuery('<img />')
                img.attr({'src':(!joker ? '{0}/cards/75percent/{1}-{2}-75.png'.format(img_path, suit, value) : '{0}/cards/75percent/joker-{1}-75.png'.format(img_path, joker))});
                img.bind('load', function() {
                    n_card_images_loaded++;
                    if (n_card_images_loaded >= 53) {
                        loading_div.css('visibility', 'hidden');
                        new_btn.css('visibility', 'visible');
                    }
                });
                img_div.css({
                    position: 'absolute',
//                    'background-image': 'url({0}2)'.format(img.src),
//                    'background-image': (!joker ? 'url({0}/cards/75percent/{1}-{2}-75.png)'.format(img_path, suit, value) : 'url({0}/cards/75percent/joker-{1}-75.png)'.format(img_path, joker)),
                    width: CARD_IMG_WIDTH_PX,
                    height: CARD_IMG_HEIGHT_PX
                });
                //img_div.front_img_url = (!joker ? 'url({0}/cards/75percent/{1}-{2}-75.png)'.format(img_path, suit, value) : 'url({0}/cards/75percent/joker-{1}-75.png)'.format(img_path, joker));
                img_div.front_img_url = 'url({0})'.format(img.attr('src')),
                card.img_div = img_div;
                card.let_mouse_out = false;

                card.bind('mouseover', function() {
                    if (card.is_selectable && card.side == 'front') {
                        card.img_div.css('border', '1px solid yellow');
                    }
                });

                card.bind('mouseout', function() {
                    card.img_div.css('border', '0px');
                });

                // card selection mask (transparent blue)
                var sel_div = jQuery('<div />').appendTo(card);
                sel_div.css({
                    position: 'absolute',
                    'background-color': 'blue',
                    width: CARD_IMG_WIDTH_PX,
                    height: CARD_IMG_HEIGHT_PX,
                    opacity: 0.3,
                    filter: 'alpha(opacity=30)',
                    visibility: 'hidden'
                });
                card.sel_div = sel_div;

                // here we wrap the card method definitions inside anon functions,
                // to avoid the "closure in for loop" problem; the trick is to provide another scope
                // level to the card variable itself, card_copy, which is passed as param to anon functions

                (function(card_copy) {
                    card_copy.isSelected = function() {
                        return (card_copy.sel_div.css('visibility') == 'visible');
                    };
                })(card);

                (function(card_copy) {
                    card_copy.toggleSelection = function() {
                        if (card_copy.is_selectable && card_copy.side == 'front') {
                            card_copy.sel_div.css({'visibility': (card_copy.isSelected() ? 'hidden' : 'visible')});
                        }
                    };
                })(card);

                (function(card_copy) {
                    card_copy.setSelected = function(b) {
                        if (card_copy.is_selectable && card_copy.side == 'front') {
                            card_copy.sel_div.css({'visibility': (b ? 'visible' : 'hidden')});
                        }
                    };
                })(card);

                (function(card_copy) {
                    card_copy.bind('click', card_copy.toggleSelection);
                })(card);

                (function(card_copy) {
                    card_copy.setPos = function(left, top) {
                        card_copy.css({
                            left: '{0}px'.format(left),
                            top: '{0}px'.format(top)
                        });
                    }
                })(card);

                (function(card_copy) {
                    card_copy.setX = function(left) {
                        card_copy.css({
                            left: '{0}px'.format(left)
                        });
                    }
                })(card);

                (function(card_copy) {
                    card_copy.setY = function(top) {
                        card_copy.css({
                            top: '{0}px'.format(top)
                        });
                    }
                })(card);

                (function(card_copy) {
                    card_copy.getPos = function() {
                        return [parseInt(card_copy.css('left')), parseInt(card_copy.css('top'))];
                    }
                })(card);

                (function(card_copy) {
                    card_copy.addPos = function(left, top) {
                        var pos = card_copy.getPos();
                        card_copy.css({
                            left: '{0}px'.format(pos[0] + left),
                            top: '{0}px'.format(pos[1] + top)
                        });
                    }
                })(card);

                (function(card_copy) {
                    card_copy.addX = function(left) {
                        var pos = card_copy.getPos();
                        card_copy.css({
                            left: '{0}px'.format(pos[0] + left)
                        });
                    }
                })(card);

                (function(card_copy) {
                    card_copy.addY = function(top) {
                        var pos = card_copy.getPos();
                        card_copy.css({
                            top: '{0}px'.format(pos[1] + top)
                        });
                    }
                })(card);

                (function(card_copy) {
                    card_copy.setSide = function(side) {
                        card_copy.img_div.css('background-image', side=='front'?card_copy.img_div.front_img_url:'url({0}/cards/75percent/back-blue-75-1.png)'.format(img_path));
                        card_copy.side = side;
                    }
                })(card);

                (function(card_copy) {
                    card_copy.hide = function(side) {
                        card_copy.img_div.css('visibility', 'hidden');
                    }
                })(card);

                (function(card_copy) {
                    card_copy.show = function(side) {
                        card_copy.img_div.css('visibility', 'visible');
                    }
                })(card);

                card.appendTo(tdc_div);

                return card;
            };

            var card_values = ['3','4','5','6','7','8','9','10','j','q','k','a', '2'];
            var card_suits = ['hearts', 'diamonds', 'spades', 'clubs'];

            var deck = [];

            // regular cards
            for (var v = 0; v < card_values.length; v++) {
                for (var s = 0; s < card_suits.length; s++) {
                    var card = createCard(card_values[v], card_suits[s], v, null);
                    deck.push(card);
                }
            }
            // add joker for reprPlay
            card_values.push('Jk');

            // jokers
            deck.push(createCard(null, null, 13, 'b'));
            deck.push(createCard(null, null, 13, 'r'));

            var setDeckVisibility = function(v) {
                for (var i = 0; i < deck.length; i++) {
                    //deck[i][v?'show':'hide']();
                    if (v) { deck[i].show(); }
                    else { deck[i].hide(); }
                    deck[i].setSelected(false);
                }
            };

            // Player object

            var Player = function(is_ai, next_rank, name) {

                var that = this;
                this.is_ai = is_ai;
                this.is_playing = true; // player has been or not eliminated from current game
                this.rank = null; // 0:president (highest), 3:tdc (least)
                this.next_rank = next_rank;
                this.rank_stats = [0, 0, 0, 0]
                this.rank_stats[next_rank] += 1;
                this.name = name;

                // 0: all, 1:simples, 2:doubles, 3:triples, 4:quads, 5:twos, 6:jokers
                this.sets = [[], [], [], [], [], [], []];

                this.sortCards = function() {
                    // sort by tdc_rank (3=low, joker=high)
                    // note: IE wants the compare fct to return -1,0,1
                    this.sets[ALL].sort(function(a, b) {
                        if (a.tdc_rank >= b.tdc_rank) { return 1; }
                        else { return -1; }
                    });
                };

                this.setCards = function(cards) {
                    this.sets[ALL] = cards;
                    this.sortCards();
                };

                // Build all the n-sets from the set of all cards
                this.rebuild = function(n_jokers_out) {

                    if (this.sets[ALL].length == 0) { return; }
                    this.sortCards();

                    // reset sets, except ALL
                    for (var i = SIMPLES; i <= JOKERS; i++) { this.sets[i].length = 0; }
                    var last = this.sets[ALL][0];
                    var acc = [last];
                    for (var i = 1; i < this.sets[ALL].length; i++) {
                        var cur = this.sets[ALL][i];
                        if (last.tdc_rank == 12) { this.sets[TWOS].push(last); }
                        else if (last.tdc_rank == 13) { this.sets[JOKERS].push(last); }
                        else {
                            if (last.tdc_rank != cur.tdc_rank) {
                                this.sets[acc.length].push(acc.slice());
                                acc.length = 0;
                            }
                            acc.push(cur);
                        }
                        last = cur;
                    }
                    if (last.tdc_rank == 12) { this.sets[TWOS].push(last); }
                    else if (last.tdc_rank == 13) { this.sets[JOKERS].push(last); }
                    else { this.sets[acc.length].push(acc.slice()); }

                    // least_tdc_rank: rank of the smallest value set (weakest card), which we intend to play as the very last, just after a "cut card" (card with which we're sure to win the hand)
                    this.least_tdc_rank = -1;
                    if ((n_jokers_out == 2 && this.sets[TWOS].length > 0) || this.sets[JOKERS].length > 0) {
                        if (this.sets[ALL][0].tdc_rank <= 11) {
                            this.least_tdc_rank = this.sets[ALL][0].tdc_rank;
                        }
                    }
//                    console.log('[least_tdc_rank for player with rank {0}: {1} ({2})]'.format(this.rank, this.least_tdc_rank, this.least_tdc_rank>=0?card_values[this.least_tdc_rank]:'<none>'));

                };

                // Main AI heuristic rules

                this.playAI = function(prev_play, is_last_to_play) {

                    if (!prev_play) { // first play (no previous one)

                        // From SIMPLES to QUADS..
                        //
                        for (var p = 0; p < 2; p++) { // first pass with threshold, second without
                            for (var n = SIMPLES; n <= QUADS; n++) { // every sets from SIMPLES to QUADS
                                if (this.sets[n].length > 0) {
                                    var ns00 = this.sets[n][0][0]; // lowest (first) card of set
                                    if ((ns00.tdc_rank <= AI_FIRST_PLAY_TDC_RANK_THRESHOLD || p == 1) && ns00.tdc_rank != this.least_tdc_rank) {
                                        this.removeCards(this.sets[n][0]);
                                        return {
                                            tdc_rank: ns00.tdc_rank,
                                            n: n,
                                            player: this,
                                            cards: this.sets[n][0]
                                        };
                                    } else if (this.sets[n].length > 1 && ns00.tdc_rank == this.least_tdc_rank) {
                                        var ns10 = this.sets[n][1][0]; // next lowest (first) card of set
                                        if (ns10.tdc_rank <= AI_FIRST_PLAY_TDC_RANK_THRESHOLD || p == 1) {
                                            this.removeCards(this.sets[n][1]);
                                            return {
                                                tdc_rank: ns10.tdc_rank,
                                                n: n,
                                                player: this,
                                                cards: this.sets[n][1]
                                            };
                                        }
                                    }
                                }
                            }
                        }

                        // if nothing left, look in TWOS/JOKERS
                        for (var n = TWOS; n <= JOKERS; n++) {
                            if (this.sets[n].length > 0) {
                                this.removeCards(this.sets[n].slice(0, n==JOKERS ? 1 : this.sets[n].length));
                                return {
                                    tdc_rank: n==JOKERS ? 13 : 12,
                                    n: n==JOKERS ? 1 : this.sets[n].length,
                                    player: this,
                                    cards: this.sets[n].slice(0, n==JOKERS ? 1 : this.sets[n].length)
                                };
                            }
                        }

                        // this point should not be reached
                        assert(false, 'ERROR in Player.playAI: could not find a valid first play');

                    } else { // there was a previous play, which we must take into account of course

                        // search in set of same n first
                        for (var p = 0; p < 2; p++) {
                            // nsi: n-set i
                            for (var nsi = 0; nsi < this.sets[prev_play.n].length; nsi++) {
                                nsi0 = this.sets[prev_play.n][nsi][0];
                                if (prev_play.tdc_rank < nsi0.tdc_rank) {
                                    if ((p==0 && nsi0.tdc_rank != this.least_tdc_rank && (nsi0.tdc_rank <= AI_STRONG_PLAY_TDC_RANK_THRESHOLD || this.isForcedToPlay(prev_play, is_last_to_play))) ||
                                        (p==1 && (nsi0.tdc_rank <= AI_STRONG_PLAY_TDC_RANK_THRESHOLD || this.isForcedToPlay(prev_play, is_last_to_play)))) {
                                        this.removeCards(this.sets[prev_play.n][nsi]);
                                        return {
                                            tdc_rank: nsi0.tdc_rank,
                                            n: prev_play.n,
                                            player: this,
                                            cards: this.sets[prev_play.n][nsi]
                                        };
                                    }
                                }
                            }
                        }
                        // forced to play: will possibly break a higher than n set, or play strong cards
                        if (this.isForcedToPlay(prev_play, is_last_to_play)) {
                            for (var p = 0; p < 2; p++) {
                                for (var n = prev_play.n + 1; n <= QUADS; n++) {
                                    for (var nsi = 0; nsi < this.sets[n].length; nsi++) {
                                        nsi0 = this.sets[n][nsi][0];
                                        if (nsi0.tdc_rank > prev_play.tdc_rank &&
                                            (nsi0.tdc_rank <= AI_STRONG_PLAY_TDC_RANK_THRESHOLD || p == 1)) {
                                            this.removeCards(this.sets[n][nsi].slice(0, prev_play.n));
                                            return {
                                                tdc_rank: nsi0.tdc_rank,
                                                n: prev_play.n,
                                                player: this,
                                                cards: this.sets[n][nsi].slice(0, prev_play.n)
                                            };
                                        }
                                    }
                                }
                                // twos and jokers
                                if (p == 0) {
                                    // on a simple: 1, on a n set: n-1
                                    var n_2s_required = prev_play.n == 1 ? 1 : prev_play.n - 1;
                                    if (this.sets[TWOS].length >= n_2s_required && prev_play.tdc_rank < 12) {
                                        this.removeCards(this.sets[TWOS].slice(0, n_2s_required));
                                        return {
                                            tdc_rank: 12,
                                            n: n_2s_required,
                                            player: this,
                                            cards: this.sets[TWOS].slice(0, n_2s_required)
                                        };
                                    }
                                    if (this.sets[JOKERS].length > 0 && prev_play.tdc_rank < 13) {
                                        this.removeCards([this.sets[JOKERS][0]]);
                                        return {
                                            tdc_rank: 13,
                                            n: 1,
                                            player: this,
                                            cards: [this.sets[JOKERS][0]]
                                        };
                                    }

                                }
                            }
                        }

                        // nothing found: must skip
                        return {
                            n: 0,
                            player: this
                        };

                    }
                };

                this.isForcedToPlay = function(prev_play, is_last_to_play) {
                    return (is_last_to_play || this.sets[ALL].length <= AI_NEAR_END_N_CARDS_THRESHOLD ||
                            this.sets[ALL].length > getAvgNumberOfCardsPerPlayer() + AI_N_CARDS_BELOW_AVG_MARGIN ||
                            (prev_play.tdc_rank >= AI_STRONG_PLAY_TDC_RANK_THRESHOLD &&
                                prev_play.player.sets[ALL].length <= AI_NEAR_END_N_CARDS_THRESHOLD));
                };

                this.removeCards = function(cards) {
                    for (var i = 0; i < cards.length; i++) {
                        this.sets[ALL].splice(this.sets[ALL].indexOf(cards[i]), 1);
                        //cards[i].hide();
                    }
                };

                this.addCards = function(cards) {
                    for (var i = 0; i < cards.length; i++) {
                        this.sets[ALL].push(cards[i]);
                    }
                };

                this.getHandStrength = function() {
                    var hs = 0.0;
                    for (var n = SIMPLES; n <= QUADS; n++) {
                        var n_mod = n + ((n - 1) * 0.5);
                        for (var nsi = 0; nsi < this.sets[n].length; nsi++) {
                            hs += this.sets[n][nsi][0].tdc_rank * n_mod;
                        }
                    }
                    for (var twos = 0; twos < this.sets[TWOS].length; twos++) { hs += 12; }
                    for (var jks = 0; jks < this.sets[JOKERS].length; jks++) { hs += 13; }
                    return hs / (this.sets[ALL].length);
                };

            };

            var players = [];
            // set this to -1 for AI-only play
            var human_player_idx = Math.floor(Math.random() * 4);
            var player_names = ['AI1', 'AI2', 'AI3', 'AI4'];
            var pn_idx = 0;

            players[0] = new Player(human_player_idx != 0, 0, (human_player_idx != 0 ? player_names[pn_idx++] : 'You'));
            players[1] = new Player(human_player_idx != 1, 1, (human_player_idx != 1 ? player_names[pn_idx++] : 'You'));
            players[2] = new Player(human_player_idx != 2, 2, (human_player_idx != 2 ? player_names[pn_idx++] : 'You'));
            players[3] = new Player(human_player_idx != 3, 3, (human_player_idx != 3 ? player_names[pn_idx++] : 'You'));
            var ranked_players = [null, null, null, null]; // rank -> Player (set in newGame)

            var card_zindex = 0;
            // add cards to board
            var setupBoard = function() {

                setStarIcon(true);

                card_zindex = 0;

                var r0_base_left = 115;
                var r0_top = 15;
                var pr0 = ranked_players[0];
                for (var i = 0; i < pr0.sets[ALL].length; i++) {
                    pr0.sets[ALL][i].css({'z-index': card_zindex++});
                    pr0.sets[ALL][i].setPos(r0_base_left, r0_top);
                    if (!show_all_cards) {
                        pr0.sets[ALL][i].setSide(pr0.is_ai ? 'back' : 'front');
                    }
                    r0_base_left += HORIZONTAL_CARD_SPACER;
                }

                var r1_left = 530;
                var r1_base_top = 140;
                var pr1 = ranked_players[1];
                for (var i = pr1.sets[ALL].length - 1; i >= 0; i--) {
                    pr1.sets[ALL][i].css({'z-index': card_zindex++});
                    pr1.sets[ALL][i].setPos(r1_left, r1_base_top);
                    if (!show_all_cards) {
                        pr1.sets[ALL][i].setSide(pr1.is_ai ? 'back' : 'front');
                    }
                    r1_base_top += VERTICAL_CARD_SPACER;
                }

                var r2_base_left = 160;
                var r2_top = 480;
                var pr2 = ranked_players[2];
                for (var i = 0; i < pr2.sets[ALL].length; i++) {
                    pr2.sets[ALL][i].css({'z-index': card_zindex++});
                    pr2.sets[ALL][i].setPos(r2_base_left, r2_top);
                    if (!show_all_cards) {
                        pr2.sets[ALL][i].setSide(pr2.is_ai ? 'back' : 'front');
                    }
                    r2_base_left += HORIZONTAL_CARD_SPACER;
                }

                var r3_left = 20;
                var r3_base_top = 140;
                var pr3 = ranked_players[3];
                for (var i = pr3.sets[ALL].length - 1; i >= 0; i--) {
                    pr3.sets[ALL][i].css({'z-index': card_zindex++});
                    pr3.sets[ALL][i].setPos(r3_left, r3_base_top);
                    if (!show_all_cards) {
                        pr3.sets[ALL][i].setSide(pr3.is_ai ? 'back' : 'front');
                    }
                    r3_base_top += VERTICAL_CARD_SPACER;
                }
            };

            var getAvgNumberOfCardsPerPlayer = function() {
                var n = 0;
                for (var i = 0; i < 4; i++) {
                    n += players[i].sets[ALL].length;
                }
                return n / 4;
            };

            var getPlayersStillPlaying = function() {
                var pp = [];
                for (var i = 0; i < 4; i++) {
                    if (players[i].is_playing) { pp.push(players[i]); }
                }
                return pp;
            };

            // a string repr of a play (move)
            var reprPlay = function(play) {
                if (!play) { return '<none>'; }
                if (play.n == 0) { return '{0}: <skips>'.format(play.player.rank) + (play.player.is_ai?'':' (*)'); }
                var c = [];
                for (var i = 0; i < play.n; i++) {
                    c.push(card_values[play.tdc_rank]);
                }
                return '{0}: '.format(play.player.rank) + c.join('-') + (play.player.is_ai?'':' (*)');
            };

            var rebuildPlayers = function() {
                for (i = 0; i < 4; i++) {
                    players[i].rebuild(n_jokers_out);
                }
            };

            var setStarIcon = function(visible) {
                if (visible) {
                    var curr_player = ranked_players[curr_player_rank];
                    if (prev_play == null) {
                        star_icon.css({
                            visibility: 'visible',
                            left: rank_star_icon_pos[curr_player.rank][0],
                            top: rank_star_icon_pos[curr_player.rank][1]
                        });
                    }
                } else {
                    star_icon.css('visibility', 'hidden');
                }
            };

            // round bookkeeping stuff
            var curr_player_rank; // this always cycle from 0 -- 3; incremented steadily (whether a player is playing or not)
            var n_remaining_players; // decremented when a player wins, from 4 to 1
            var curr_player_idx; // this always cycle from 0 -- (n_remaining_players - 1); incremented whenever a player plays, and decremented when one wins
            var prev_play; // last non-skip play
            var n_jokers_out;
            var next_won_rank; // everything a player wins, this is incremented
            var end_of_turn_reached;
            var end_of_game_reached;
            var curr_human_rank;

            // main game sequencing logic (AI part)

            var playAI = function() {

                var curr_player = ranked_players[curr_player_rank]

                // playing AI
                if (curr_player.is_ai && curr_player.is_playing) {

                    var curr_play = curr_player.playAI(prev_play, (curr_player_idx == n_remaining_players - 1));
                    console.log(reprPlay(curr_play), '(hs={0})'.format(curr_player.getHandStrength()));
                    var skips = false;
                    if (curr_play.n > 0) { // valid play
                        rank_play_icons[curr_player.rank].css('visibility', 'visible');
                        startCardMover(curr_play.cards, CENTER_CARD_PILE_POS, true);
                        prev_play = curr_play;
                        if (curr_play.tdc_rank == 13) { n_jokers_out++; }
                        // AI wins (no more card)
                        if (curr_player.sets[ALL].length == 0) {
                            rank_next_rank_icons[next_won_rank].css({
                                left: rank_next_rank_icons_pos[curr_player.rank][0],
                                top: rank_next_rank_icons_pos[curr_player.rank][1],
                                visibility: 'visible'
                            });
                            curr_player.next_rank = next_won_rank;
                            curr_player.rank_stats[curr_player.next_rank] += 1;
                            curr_player.is_playing = false;
                            n_remaining_players -= 1;
                            next_won_rank += 1;
                            console.log('player with rank', curr_player.rank, 'won rank', curr_player.next_rank, '(n_remaining_players={0})'.format(n_remaining_players));
                            if (n_remaining_players == 1) {
                                var last_playing_player = getPlayersStillPlaying();
                                assert(last_playing_player.length == 1);
                                rank_next_rank_icons[next_won_rank].css({
                                    left: rank_next_rank_icons_pos[last_playing_player[0].rank][0],
                                    top: rank_next_rank_icons_pos[last_playing_player[0].rank][1],
                                    visibility: 'visible'
                                });
                                end_of_game_reached = true;
                                console.log('<game over>');
                                setDeckVisibility(false);
                                setStarIcon(false);
                                // hide all play icons (arrows)
                                for (var i = 0; i < 4; i++) { rank_play_icons[i].css('visibility', 'hidden'); }
                                new_btn.css('visibility', 'visible');
                                return;
                            }
                            curr_player_idx -= 1; // possibly -1 if AI was first to play, but then will be reset to 0 right away
                        }
                    } else {
                        skips = true;
                        // AI skip anim
                        var cpi = rank_play_icons[curr_player.rank];
                        cpi.css('background-image', cpi.cross_img_url);
                        cpi.css('visibility', 'visible');
                        setTimeout(function() {
                            cpi.css('visibility', 'hidden');
                            cpi.css('background-image', cpi.arrow_img_url);
                        }, AI_SKIP_ANIM_DELAY);
                    }
                    // if AI is last to play
                    if (curr_player_idx == n_remaining_players - 1) { // possibly gt, if player has won in round
                        end_of_turn_reached = true;
                        console.log('<end of turn>');
                        curr_player_rank = getNextPlayingRank(prev_play);
                        prev_play = null;
                        curr_player_idx = 0;
                        rebuildPlayers();
                        setupBoard();
                    } else { // not last to play
                        curr_player_rank += 1;
                        curr_player_rank %= 4;
                        curr_player_idx += 1;
                    }

                    if (skips) { concludeSkipSequence(); }

                // non-playing AI
                } else if (curr_player.is_ai && !curr_player.is_playing) {

                    curr_player_rank += 1;
                    curr_player_rank %= 4;
                    playAI();

                // non-playing human (the rank increment goes through him nevertheless)
                } else if (!curr_player.is_ai && !curr_player.is_playing) {

                    curr_player_rank += 1;
                    curr_player_rank %= 4;
                    playAI();

                // playing human
                } else if (!curr_player.is_ai && curr_player.is_playing) {

                    rank_play_icons[curr_human_rank].bind('click', playHuman);
                    rank_play_icons[curr_human_rank].css('visibility', 'visible');

                }

            };

            var isPlayValid = function(prev_play, cards) {
                var n = cards.length;
                if (n == 0) {
                    return (prev_play != null); // n==0 -> skip, but dont allow it as first play
                }
                var c0 = cards[0];
                // verify that cards form a set
                for (var i = 0; i < n; i++) {
                    if (cards[i].tdc_rank != c0.tdc_rank) { return false; }
                }
                // if first to play, anything goes
                if (!prev_play) {
                    return true;
                }
                // check that tdc_rank is greater than prev_play's one
                if (c0.tdc_rank <= prev_play.tdc_rank) {
                    return false;
                }
                // check n..
                // for sets up to A
                if (c0.tdc_rank < 12) {
                    return (n == prev_play.n);
                // then for 2 sets
                } else if (c0.tdc_rank == 12) {
                    return (n+1 >= prev_play.n && n <= prev_play.n);
                }
                // for jokers it's always ok
                return true;
            };

            // main game sequencing logic (Human play callback)

            var playHuman = function() {

                var sel_cards = [];
                var human = players[human_player_idx];
                for (var i = 0; i < human.sets[ALL].length; i++) {
                    if (human.sets[ALL][i].isSelected()) {
                        sel_cards.push(human.sets[ALL][i]);
                    }
                }
                var skips = false;
                if (isPlayValid(prev_play, sel_cards)) {
                    // immediatly remove click handler on human play button, to prevent unwanted multiple plays
                    rank_play_icons[curr_human_rank].unbind('click');
                    skips = (sel_cards.length == 0);
                    if (!skips) {
                        human.removeCards(sel_cards);
                        startCardMover(sel_cards, CENTER_CARD_PILE_POS, true);
                        prev_play = {
                            n: sel_cards.length,
                            tdc_rank: sel_cards[0].tdc_rank,
                            player: human
                        };
                        if (prev_play.tdc_rank == 13) { n_jokers_out++; }
                        console.log(reprPlay(prev_play), '(hs={0})'.format(human.getHandStrength()));
                        // Human wins (no more card)
                        if (human.sets[ALL].length == 0) {
                            rank_next_rank_icons[next_won_rank].css({
                                left: rank_next_rank_icons_pos[human.rank][0],
                                top: rank_next_rank_icons_pos[human.rank][1],
                                visibility: 'visible'
                            });
                            human.next_rank = next_won_rank;
                            human.rank_stats[human.next_rank] += 1;
                            human.is_playing = false;
                            n_remaining_players -= 1;
                            next_won_rank += 1;
                            console.log('human, with rank', human.rank, 'won rank', human.next_rank, '(n_remaining_players={0})'.format(n_remaining_players));
                            if (n_remaining_players == 1) {
                                var last_playing_player = getPlayersStillPlaying();
                                assert(last_playing_player.length == 1);
                                rank_next_rank_icons[next_won_rank].css({
                                    left: rank_next_rank_icons_pos[last_playing_player[0].rank][0],
                                    top: rank_next_rank_icons_pos[last_playing_player[0].rank][1],
                                    visibility: 'visible'
                                });
                                end_of_game_reached = true;
                                console.log('<game over>');
                                setDeckVisibility(false);
                                setStarIcon(false);
                                // hide all play icons (arrows)
                                for (var i = 0; i < 4; i++) { rank_play_icons[i].css('visibility', 'hidden'); }
                                new_btn.css('visibility', 'visible');
                                return;
                            }
                            curr_player_idx -= 1; // possibly -1 if AI was first to play, but then will be reset to 0 right away
                        }
                    } else {
                        console.log(reprPlay({n:0, player:human}));
                        // skip icon: show cross briefly, and disappear
                        var hpi = rank_play_icons[curr_human_rank];
                        hpi.css('background-image', hpi.cross_img_url);
                        human_play_icon_animation = true;
                        setTimeout(function() {
                            hpi.css('visibility', 'hidden');
                            hpi.css('background-image', hpi.arrow_img_url);
                            human_play_icon_animation = false;
                        }, SHORT_ANIM_DELAY);
                    }
                    // important: do not define prev_play if human skips
                    // if human was last to play..
                    if (curr_player_idx == n_remaining_players - 1) {
                        end_of_turn_reached = true;
                        console.log('<end of turn>');
                        curr_player_rank = getNextPlayingRank(prev_play);
                        prev_play = null;
                        curr_player_idx = 0;
                        rebuildPlayers();
                        setupBoard();
                    } else {
                        curr_player_rank += 1;
                        curr_player_rank %= 4;
                        curr_player_idx += 1;
                    }

                } else {
                    console.log('<invalid play>')
                    // invalid play icon: show warning briefly, and then arrow
                    var hpi = rank_play_icons[curr_human_rank];
                    hpi.css('background-image', hpi.warning_img_url);
                    human_play_icon_animation = true;
                    setTimeout(function() {
                        hpi.css('background-image', hpi.arrow_img_url);
                        human_play_icon_animation = false;
                    }, SHORT_ANIM_DELAY);
                }
                if (skips) { concludeSkipSequence(); }
            };

            // if a player won but was also the last_player, we must find the next one still playing
            var getNextPlayingRank = function(play) {
                var rank = play.player.rank;
                while (!ranked_players[rank].is_playing) {
                    rank += 1;
                    rank %= 4;
                }
                return rank;
            };

            // card mover bookkeeping
            var card_mover_id = null;
            var moving_cards = []; // pointers to all cards currently in move
            var moved_cards = []; // pointers to all cards that have been moved, for clearing at end of turn
            var n_moved_card_sets = 0; // number of card sets already piled in center of board
            var card_moving_context = 'intro'; // or 'play'
            var card_moving_end_callback = null;

            var startCardMover = function(cards, dest_pos, set_front_side) {
                moving_cards = cards;
                for (var i = 0; i < cards.length; i++) {
                    cards[i].setSelected(false);
                    if (card_moving_context == 'play') {
                        cards[i].is_selectable = false;
                    }
                    if (set_front_side) {
                        cards[i].setSide('front');
                    }
                    cards[i].css({'z-index': card_zindex++});
                    var pos = cards[i].getPos();
                    if (card_moving_context == 'play') {
                        cards[i].end_pos = [dest_pos[0] + (i * HORIZONTAL_CARD_SPACER), dest_pos[1] + (n_moved_card_sets * VERTICAL_CARD_SPACER)];
                    } else {
                        cards[i].end_pos = [dest_pos[0][0], dest_pos[0][1]];
                    }
                    var dist = Math.sqrt(((cards[i].end_pos[0] - pos[0]) * (cards[i].end_pos[0] - pos[0])) + ((cards[i].end_pos[1] - pos[1]) * (cards[i].end_pos[1] - pos[1])));
                    var step = dist / CARD_MOVE_SPEED;
                    cards[i].step_pos = [Math.ceil((cards[i].end_pos[0] - pos[0]) / step), Math.ceil((cards[i].end_pos[1] - pos[1]) / step)];
//                    console.log('step:', cards[i].step_pos);
//                    console.log('end:', cards[i].end_pos);
                }
                if (card_moving_context == 'play') {
                    n_moved_card_sets += 1;
                    moved_cards = moved_cards.concat(cards);
                }
                card_mover_id = setInterval(moveCards, 10);
            };

            var moveCards = function() {
                var still_moving = false;
                for (var i = 0; i < moving_cards.length; i++) {
                    var pos = moving_cards[i].getPos();
//                    console.log(pos);
                    if (pos[0] != moving_cards[i].end_pos[0] || pos[1] != moving_cards[i].end_pos[1]) {
                        var pos_remaining = [Math.abs(moving_cards[i].end_pos[0] - pos[0]), Math.abs(moving_cards[i].end_pos[1] - pos[1])];
                        // if what remains on x or y is smaller than step x/y, then go directly to end x/y
                        if (pos_remaining[0] <= Math.abs(moving_cards[i].step_pos[0]) || moving_cards[i].step_pos[0] == 0) {
                            moving_cards[i].setX(moving_cards[i].end_pos[0]);
                        } else {
                            moving_cards[i].addX(moving_cards[i].step_pos[0]);
                        }
                        if (pos_remaining[1] <= Math.abs(moving_cards[i].step_pos[1]) || moving_cards[i].step_pos[1] == 0) {
                            moving_cards[i].setY(moving_cards[i].end_pos[1]);
                        } else {
                            moving_cards[i].addY(moving_cards[i].step_pos[1]);
                        }
                        still_moving = true;
                    }
                }
                // end card moving, and continue playing
                if (!still_moving && card_moving_context == 'play') {
                    clearInterval(card_mover_id);
                    if (!end_of_game_reached) {
                        if (end_of_turn_reached) {
                            end_of_turn_reached = false;
                            setTimeout(function() { // wait a moment before clearing played cards and resume play
                                hidePlayedCards();
                                // hide all play icons (arrows)
                                for (var i = 0; i < 4; i++) { rank_play_icons[i].css('visibility', 'hidden'); }
                                playAI();
                            }, END_OF_TURN_DELAY);
                        } else {
                            setTimeout(function() {
                                // hide all play icons (arrows)
                                for (var i = 0; i < 4; i++) { rank_play_icons[i].css('visibility', 'hidden'); }
                                playAI();
                            }, END_OF_CARD_MOVE_DELAY);
                        }
                    }
                } else if (!still_moving && typeof card_moving_end_callback === 'function') {
                    clearInterval(card_mover_id);
                    setTimeout(card_moving_end_callback, SHORT_ANIM_DELAY);
                }
            };

            var hidePlayedCards = function() {
                for (var i = 0; i < moved_cards.length; i++) {
                    moved_cards[i].hide();
                    moved_cards[i].is_selectable = true;
                }
                moved_cards.length = 0;
                n_moved_card_sets = 0;
            }

            var concludeSkipSequence = function() {
                setTimeout(function() {
                    if (end_of_turn_reached) {
                        end_of_turn_reached = false;
                        hidePlayedCards();
                    }
                    playAI();
                }, SHORT_ANIM_DELAY);
            }

            var human_play_icon_animation = false;

            var newGame = function() {

                new_btn.css('visibility', 'hidden');
                curr_player_rank = 0;
                n_remaining_players = 4;
                curr_player_idx = 0;
                prev_play = null;
                n_jokers_out = 0;
                next_won_rank = 0;
                end_of_turn_reached = false;
                end_of_game_reached = false;
                for (var i = 0; i < players.length; i++) { // set new ranks
                    // if player was last to won, his next_rank was not set
                    var pi = players[i];
                    if (pi.next_rank == null) {
                        pi.next_rank = 3;
                        pi.rank_stats[3] += 1;
                    }
                    ranked_players[pi.next_rank] = pi;
                    pi.rank = pi.next_rank;
                    pi.next_rank = null;
                    pi.is_playing = true;
                    rank_infos[pi.rank].name.html('<center>{0}</center>'.format(pi.name));
                    rank_infos[pi.rank].stats.html('<center>({0})</center>'.format(pi.rank_stats));
                    if (!pi.is_ai) {
                        curr_human_rank = pi.rank;
                        var cpi = rank_play_icons[pi.rank];
                        cpi.bind('click', playHuman);
                        cpi.bind('mouseover', function() {
                            if (!human_play_icon_animation) {
                                cpi.css('background-image', cpi.arrow_highlight_img_url);
                            }
                        });
                        cpi.bind('mouseout', function() {
                            if (!human_play_icon_animation) {
                                cpi.css('background-image', cpi.arrow_img_url);
                            }
                        });
                    } else {
                        rank_play_icons[pi.rank].unbind('click');
                        rank_play_icons[pi.rank].unbind('mouseover');
                        rank_play_icons[pi.rank].unbind('mouseout');
                    }
                    rank_next_rank_icons[i].css('visibility', 'hidden');
                }
                fisherYatesShuffling(deck);
                ranked_players[0].setCards(deck.slice(0, 14));
                ranked_players[1].setCards(deck.slice(14, 28));
                ranked_players[2].setCards(deck.slice(28, 41));
                ranked_players[3].setCards(deck.slice(41, 54));

/*
                ranked_players[0].setCards(deck.slice(0, 2));
                ranked_players[1].setCards(deck.slice(2, 4));
                ranked_players[2].setCards(deck.slice(4, 6));
                ranked_players[3].setCards(deck.slice(6, 8)); */

                hidePlayedCards();
                setDeckVisibility(true);
                setupBoard();

                // 22-11 card exchange sequence

                card_moving_context = 'intro';

                card_moving_end_callback = function() {
                    card_moving_end_callback = function() {
                        card_moving_end_callback = function() {
                            card_moving_end_callback = function() {
                                setTimeout(function() {
                                    card_moving_end_callback = null;
                                    rebuildPlayers();
                                    setupBoard();
                                    card_moving_context = 'play';
                                    n_moved_card_sets = 0;
                                    playAI();
                                }, SHORT_ANIM_DELAY);
                            };
                            var r1_to_r2_cards = ranked_players[1].sets[ALL].slice(0, 1);
                            ranked_players[1].removeCards(r1_to_r2_cards);
                            ranked_players[2].addCards(r1_to_r2_cards);
                            startCardMover(r1_to_r2_cards, [[160, 480]], !ranked_players[2].is_ai);
                        };
                        var r2_to_r1_cards = ranked_players[2].sets[ALL].slice(ranked_players[2].sets[ALL].length-1, ranked_players[2].sets[ALL].length);
                        ranked_players[2].removeCards(r2_to_r1_cards);
                        ranked_players[1].addCards(r2_to_r1_cards);
                        startCardMover(r2_to_r1_cards, [[530, 140]], !ranked_players[1].is_ai);
                    };
                    var r0_to_r3_cards = ranked_players[0].sets[ALL].slice(0, 2);
                    ranked_players[0].removeCards(r0_to_r3_cards);
                    ranked_players[3].addCards(r0_to_r3_cards);
                    startCardMover(r0_to_r3_cards, [[20, 140], [20, 140 + VERTICAL_CARD_SPACER]], !ranked_players[3].is_ai);
                };

                var r3_to_r0_cards = ranked_players[3].sets[ALL].slice(ranked_players[3].sets[ALL].length-2, ranked_players[3].sets[ALL].length);
                ranked_players[3].removeCards(r3_to_r0_cards);
                ranked_players[0].addCards(r3_to_r0_cards);
                setTimeout(function() {
                    startCardMover(r3_to_r0_cards, [[400, 15], [400 + HORIZONTAL_CARD_SPACER, 15]], !ranked_players[0].is_ai);
                }, SHORT_ANIM_DELAY);

            };

            new_btn.bind('click', newGame);

            setDeckVisibility(false);

        } // TDC

    }; // module return {..}

})();
