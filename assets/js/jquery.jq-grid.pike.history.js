/**
 * Copyright (C) 2011 by Pieter Vogelaar (pietervogelaar.nl) and Kees Schepers (keesschepers.nl)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * @category   PiKe
 * @copyright  Copyright (C) 2011 by Pieter Vogelaar (pietervogelaar.nl) and Kees Schepers (keesschepers.nl)
 * @author     Nico Vogelaar
 * @license    MIT
 */
(function ($) {
    $.jgrid.pike = {};

    $.jgrid.pike.history = {
        params : ["page", "rowNum", "sortname", "sortorder"],
        filters : true,
        prefix : false,
        defaults : [],
        pushState : false,
        reload : false,

        getOptions : function(options) {
            var self = this;

            var gridComplete = options.gridComplete;
            options.gridComplete = function() {
                if (undefined !== gridComplete) {
                    gridComplete.call();
                }
                self.gridComplete();
            }

            return options;
        },

        gridComplete : function() {
            this.buildHash();
        },

        buildHash : function() {
            var self = this;
            var hash = $.bbq.getState();
            $('.ui-jqgrid-btable').each(function() {
                var grid = $(this);
                self.addParamsToHash(hash, grid);

                if (self.filters) {
                    self.addFiltersToHash(hash, grid);
                }
            });

            if (this.pushState) {
                $.bbq.pushState(hash, 2);
                this.pushState = false;
            }
        },

        addParamsToHash : function(hash, grid) {
            var id = grid.getGridParam('id');
            var i, param, value;
            var prefix = (this.prefix ? id + '-' : '');

            for (i in this.params) {
                param = this.params[i];
                value = grid.getGridParam(param);
                if (value != this.defaults[id][param]) {
                    param = prefix + param;
                    if (value != hash[param]) {
                        hash[param] = value;
                        this.pushState = true;
                    }
                } else {
                    param = prefix + param;
                    if (hash[param]) {
                        delete hash[param];
                        this.pushState = true;
                    }
                }
            }
        },

        addFiltersToHash : function(hash, grid) {
            var id = grid.getGridParam('id');
            var prefix = (this.prefix ? id + '-' : '');
            var filters = $.parseJSON(grid.getGridParam('postData').filters);
            var param;

            if (filters && filters.rules && filters.rules.length > 0) {
                filters = grid.getGridParam('postData').filters;
                param = prefix + 'filters';
                if (filters != hash[param]) {
                    hash[param] = filters;
                    this.pushState = true;
                }
                hash[param] = grid.getGridParam('postData').filters;
            } else {
                param = prefix + 'filters';
                if (hash[param]) {
                    delete hash[param];
                    this.pushState = true;
                }
            }
        },

        bindHashchangeEventToWindow : function() {
            var self = this;
            $(window).bind('hashchange', function(event) {
                self.hashchangeHandler();
            });
        },

        /**
         * Hashchange handler
         */
        hashchangeHandler : function() {
            var self = this;
            var hash = $.bbq.getState();

            $('.ui-jqgrid-btable').each(function() {
                var grid = $(this);
                var id = grid.getGridParam('id');
                var i, x, found, param, value, hashValue, params = [];
                var prefix = (self.prefix ? id + '-' : '');

                // Handle params
                for (i in self.params) {
                    param = self.params[i];
                    value = hash[(self.prefix ? id + '-' : '') + param] || self.defaults[id][param];
                    if (grid.getGridParam(param) != value) {
                        params[param] = value;
                        self.reload = true;
                    }
                }

                var filters = $.parseJSON(grid.getGridParam('postData').filters);
                var hashFilters = $.parseJSON(hash[prefix + 'filters']);

                // Delete filters
                if (null !== filters) {
                    for (i in filters.rules) {
                        found = false;
                        if (null !== hashFilters) {
                            for (x in hashFilters.rules) {
                                if (filters.rules[i].field == hashFilters.rules[x].field) {
                                    found = true;
                                    continue;
                                }
                            }
                        }
                        if (!found) {
                            grid.closest('.ui-jqgrid')
                                .find('input[name="' + filters.rules[i].field + '"]')
                                .val('');

                            filters.rules.splice(i, 1);
                            self.reload = true;
                        }
                    }
                }

                // Add filters
                if (null !== hashFilters) {
                    for (i in hashFilters.rules) {
                        found = false;
                        for (x in filters.rules) {
                            if (hashFilters.rules[i].field == filters.rules[x].field) {
                                value = filters.rules[x].data;
                                hashValue = hashFilters.rules[i].data;
                                if (value != hashValue) {
                                    filters.rules[x].data = hashValue;

                                    grid.closest('.ui-jqgrid')
                                        .find('input[name="' + filters.rules[x].field + '"]')
                                        .val(hashValue);

                                    self.reload = true;
                                }
                                found = true;
                                continue;
                            }
                        }
                        if (!found) {
                            filters.rules.push(hashFilters.rules[i]);

                            grid.closest('.ui-jqgrid')
                                .find('input[name="' + hashFilters.rules[i].field + '"]')
                                .val(hashFilters.rules[i].data);

                            self.reload = true;
                        }
                    }
                }

                // Add filters to postData
                if (filters) {
                    params['postData'] = {
                        filters : JSON.stringify(filters)
                    };
                }

                if (self.reload) {
                    grid.setGridParam(params).trigger("reloadGrid");
                    self.reload = false;
                }
            });
        },

        setDefaults : function(grid) {
            var defaults = [];
            for (var i in this.params) {
                defaults[this.params[i]] = grid.getGridParam(this.params[i]);
            }
            this.defaults[grid.getGridParam('id')] = defaults;
        }
    };

    $.fn.jqGridHistory = function(options) {
        this.jqGrid($.jgrid.pike.history.getOptions(options));
        $.jgrid.pike.history.bindHashchangeEventToWindow();
        $.jgrid.pike.history.setDefaults(this);
        return this;
    };
})(jQuery);