(function (w20) {
    w20.strings = {
        parseQueryString: function (value) {
            var query = {};
            value.search.substr(1).split("&").forEach(function (item) {
                var k = item.split("=")[0], v = decodeURIComponent(item.split("=")[1]).replace(/\+/g, ' ');
                (k in query) ? query[k].push(v) : query[k] = [v]
            });

            return query;
        },

        toTitleCase: function (value) {
            var smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|vs?\.?|via)$/i;

            return value.replace(/[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g, function (match, index, title) {
                if (index > 0 && index + match.length !== title.length &&
                    match.search(smallWords) > -1 && title.charAt(index - 2) !== ":" &&
                    (title.charAt(index + match.length) !== '-' || title.charAt(index - 1) === '-') &&
                    title.charAt(index - 1).search(/[^\s-]/) < 0) {
                    return match.toLowerCase();
                }

                if (match.substr(1).search(/[A-Z]|\../) > -1) {
                    return match;
                }

                return match.charAt(0).toUpperCase() + match.substr(1);
            });
        }
    };

    w20.ui = {
        openSearch: function () {
            w20.searchService.warm();
            $('.search-open').show();
            $('.search-btn').removeClass('fa-search').addClass('fa-times');
            $('#search-field').focus();
        },

        closeSearch: function searchClose() {
            $('#search-field').blur();
            $('.search-open').hide();
            $('.search-btn').addClass('fa-search').removeClass('fa-times');
        }
    };

    w20.searchService = (function initializeIndex() {
        var lunrIndex,
            metadata;

        function ensureInitialized(callback, errback) {
            if (!lunrIndex) {
                var searchIndexTimestamp = localStorage.getItem("searchIndexTimestamp");

                if (!searchIndexTimestamp || (new Date()).getTime() - searchIndexTimestamp > 86400 * 1000) {
                    console.log('fetching and building search index');
                    $.getJSON("/lunr-index.json", function (fetched) {
                        lunrIndex = lunr(function () {
                            this.field('title', {boost: 15});
                            this.field('tags', {boost: 10});
                            this.field('content');
                            this.ref('href');
                        });

                        $.each(fetched, function (dummy, doc) {
                            lunrIndex.add(doc);
                        });

                        metadata = fetched.map(function (doc) {
                            delete doc.content;
                            return doc;
                        });

                        localStorage.setItem("searchMetadata", JSON.stringify(metadata));
                        localStorage.setItem("searchIndex", JSON.stringify(lunrIndex));
                        localStorage.setItem("searchIndexTimestamp", (new Date()).getTime());

                        callback();
                    }).fail(function () {
                        console.error("unable to fetch index");
                        errback();
                    });
                } else {
                    callback();
                }
            } else {
                callback();
            }
        }

        return {
            warm: function (callback, errback) {
                ensureInitialized(function () {
                    if (typeof callback === 'function') {
                        callback();
                    }
                }, function () {
                    if (typeof errback === 'function') {
                        console.warn("unable to warm cache");
                    }
                });
            },

            clear: function () {
                localStorage.removeItem("searchMetadata");
                localStorage.removeItem("searchIndex");
                localStorage.removeItem("searchIndexTimestamp");
                lunrIndex = undefined;
                metadata = undefined;
            },

            search: function (q, callback, errback) {
                ensureInitialized(function () {
                    if (!metadata || !lunrIndex) {
                        console.log('loading search index from cache');
                        metadata = JSON.parse(localStorage.getItem("searchMetadata"));
                        lunrIndex = lunr.Index.load(JSON.parse(localStorage.getItem("searchIndex")));
                    }

                    if (typeof callback === 'function') {
                        callback(lunrIndex.search(q).map(function (result) {
                            return metadata.filter(function (page) {
                                return page.href === result.ref;
                            })[0];
                        }));
                    }
                }, function () {
                    if (typeof errback === 'function') {
                        errback();
                    }
                });
            }
        };
    })();

    var event;
    try {
        event = new CustomEvent('w20')
    } catch (e) {
        // older browsers
        event = document.createEvent('CustomEvent');
        event.initCustomEvent('w20', true, false, null);
    }
    document.dispatchEvent(event);

})(window.w20);
