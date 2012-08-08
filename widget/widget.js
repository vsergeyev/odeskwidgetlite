

OdeskWidget = {
    init: function(params) {
        var that = this,
            defaults = {
                id: "odesk-widget",
                api: "providers",
                perPage: 5,
                total_results: 0,
                hash: "",
                //oDesk API params
                q: "",
                page: 0
            },
            // order in this list also define order of filter sections
            api_params = ['min', 'max', 'fb', 'c1', 'c2', 'to',
                          'rdy', 'hrs', 'loc', 'pt', 'last', 'test', 'eng', 'g',
                          't', 'wl', 'dur', 'dp', 'st', 'tba', 'gr',
                          'sort'],
            api_titles_map = {
                "providers": "contractors",
                "jobs": "jobs"
            },
            css_map = {
                "providers": "contractor",
                "jobs": "job"
            };

        // Save original init params
        this.params = params;
        if (!this.params.hasOwnProperty('filters'))
            this.params.filters = {};
        this.api_params = api_params;

        // Common params
        for (var key in defaults)
            if (params.hasOwnProperty(key))
                this[key] = this.escape(params[key]);
            else
                this[key] = defaults[key];

        // additional API params
        var min_added = false; // indicates that we added min-max range filter section, so we don't add it again on 'max' param
        for (var i in api_params) {
            var key = api_params[i];
            if (params.hasOwnProperty(key)) {
                this[key] = this.escape(params[key]);
                // add filter section for this param if we can
                if (this.available_filters.hasOwnProperty(key)) {
                    this.params.filters[key] = this.available_filters[key];
                    //console.log(key);
                } else {
                    if ((key == 'min' || key == 'max') && !min_added) {
                        min_added = true;
                        this.params.filters["min-max"] = this.available_filters["min-max"];
                        //console.log(key);
                    }
                }
            }
        }

        this.api_endpoint = "https://www.odesk.com/api/profiles/v1/search/" + this.api + ".json?callback=?&";
        this.see_all_endpoint = "https://www.odesk.com/" + api_titles_map[this.api] + "/"; // See all link

        //DOM
        this.root = $("#"+this.id);
        this.dom = {
            "title": this.root.find(".odesk-title-default"),
            "expand_button": this.root.find(".odesk-expand-filter-and-sort"),
            "listing_wrapper": $("#" + this.id + ".odesk-apitype-listing"),
            "filters_wrapper": this.root.find(".odesk-apitype-filter-and-sort"),
            "filters": this.root.find(".odesk-filters-more"),
            "listing": this.root.find(".odesk-widget-listing-panel"),
            "footer": this.root.find(".odesk-widget-more")
        }

        this.dom.title.html(api_titles_map[this.api]); // Set title

        // CSS selectors - TODO: can be removed in future, now we depend on legacy widget's CSS
        this.dom.listing_wrapper.addClass("odesk-" + css_map[this.api] + "-listing");
        this.dom.filters_wrapper.addClass("odesk-" + css_map[this.api] + "-filter-and-sort");

        if (this.params.hasOwnProperty('filters'))
            this.build_filters();

        // EVENT HANDLERS

        this.dom.filters.hide();
        this.dom.expand_button.click(function(){
            that.dom.filters.toggle();
            that.dom.expand_button.html(that.dom.filters.is(":visible") ? "Less..." : "More...");
        });

        // Set query into search box
        if (this.params["q"])
            $("#odesk-query").val(this.params.q);
        // Search box changed
        $("#odesk-query").keyup(function(event){
            if(event.keyCode == 13){
                that.q = $("#odesk-query").val();
                that.page = 0;
                that.set_hash();
                //window.location.hash = '{"offset": "0"}';
            }
        });

        $(window).bind('hashchange', function() {
            //paginator changed current page
            var bits = jQuery.parseJSON(window.location.hash.split('#')[1]);
            if (bits.hasOwnProperty("offset")) {
                that.page = bits.offset / that.perPage;
                that.api_query();
            }
        });

        this.api_query();
    },

    escape: function(val) {
        // Replaces & with %26
        return val.replace(/&/g,"%26");
    },

    set_hash: function() {
        // Sets hash for current browser URL
        // Example: /../widget.html#{"api": "jobs", "q": "python"}
        // This hash represents state of widget
        // so  user can share this url and other person will see results and page, noted by that user
        // Something like that :)

        window.location.hash = '{"offset": "' + this.page*this.perPage + '", "q": "' + this.q + '"}';
    },

    append_get_params: function() {
        // Builds query string to oDesk API
        // Return value example: "q=python&page=0;5"

        // In API `page` actually is `offset;perPage`
        var ret = "q=" + this.q + "&page=" + this.page*this.perPage + ";" + this.perPage + "&proxy_page="+ this.perPage;

        for (var i in this.api_params) {
            var key = this.api_params[i];
            if (this.hasOwnProperty(key) && this[key] != "") {
                if (typeof(this[key]) == 'string')
                    ret += "&" + key + "=" + this[key];
                else {
                    for (var j in this[key])
                        if (this[key][j] && this[key][j] != "")
                            ret += "&" + key + "=" + this[key][j];
                }
            }
        }

        return ret
    },

    set_footer_link: function() {
        // Sets text and link for "See all" in footer
        this.dom.footer.attr("href", this.see_all_endpoint + "?" + this.append_get_params());

        if (this.proxy_in_progress) {
            this.dom.expand_button.hide();
            $("#odesk-query").attr("disabled", "disabled");
            this.dom.footer.find("span").first().html("Estimating...");
            return;
        } else {
            this.dom.expand_button.show();
            $("#odesk-query").removeAttr("disabled");
        }

        if (this.total_results < 5000)
            this.dom.footer.find("span").first().html("See all " + this.total_results + " " + this.api);
        else
            this.dom.footer.find("span").first().html("See all 5000+ " + this.api);
    },

    show_loading: function() {
        //Displays spinner in the listing area
        this.dom.listing.html("<img src='http://i245.photobucket.com/albums/gg58/pipoltek/blogs/a-load.gif' />");
    },

    add_paginator: function() {
        // Paginator
        this.dom.listing.append('<div class="odesk-widget-listing-page-navigation-controls odesk-widget-listing-page-navigation-controls-top"></div>');
        $(".odesk-widget-listing-page-navigation-controls-top").append('<div class="odesk-pagination"></div>');
        $(".odesk-pagination").append('<ul style="margin-left: 36px; "></ul>');
        if (this.total_results > 0) {
            var pages = this.total_results / this.perPage,
                pages_data = [],
                paginator = $(".odesk-pagination").find("ul");

            //<< Prev
            if (this.page > 0)
                pages_data.push({
                    "i": "<< Prev",
                    "current": false,
                    "offset": (this.page-1) * this.perPage
                });

            for (var i=Math.max(this.page-4,0); i<Math.min(this.page+5,pages); i++) {
                pages_data.push({
                    "i": i + 1,
                    "current": (i==this.page),
                    "offset": i * this.perPage
                });
            }

            //Next >>
            if (this.page < pages-1)
                pages_data.push({
                    "i": "Next >>",
                    "current": false,
                    "offset": (this.page+1) * this.perPage
                });

            $("#pagesTemplate").tmpl(pages_data).appendTo(paginator);
        }
    },

    // -- ODESK API ----------------------------------------------------------

    get_api_query: function() {
        //Concatenates oDesk API URL with GET params
        //if (this.params.hasOwnProperty("sort") || this.q.indexOf(", ") != -1)
        return this.api_endpoint + this.append_get_params();
    },

    api_response: function(data) {
        this.dom.listing.html("");
        this.total_results = 0;

        if (data[this.api] && data[this.api]["lister"])
            this.total_results = data[this.api]["lister"]["total_items"];

        this.set_footer_link();

        if (this.total_results && this.total_results > 0) {
            this.add_paginator();

            // Fill listing with items
            if (this.api == "providers") {
                this.dom.listing.append("<ul class='odesk-contractors'></ul>")
                $("#providersTemplate").tmpl(data["providers"]["provider"]).appendTo(".odesk-contractors");
            } else {
                this.dom.listing.append("<ul class='odesk-jobs'></ul>")
                $("#jobsTemplate").tmpl(data["jobs"]["job"]).appendTo(".odesk-jobs");
            }
        }
        else
            if (this.api == "providers")
                this.dom.listing.append('<div class="odesk-contractors"><h5 class="odesk-noitems-message"><span>&nbsp;</span>Sorry, no results found</h5></div>');
            else
                this.dom.listing.append('<div class="odesk-jobs"><h5 class="odesk-noitems-message"><span>&nbsp;</span>Sorry, no results found</h5></div>');
    },

    api_query: function() {
        //Performs actual JSONP query to oDesk API
        var that = this;

        this.show_loading();

        jQuery.getJSON(this.get_api_query(), function(data) {that.api_response(data)});
    },

    // -- FILTERS FACTORY ----------------------------------------------------

    build_filters: function() {
        this.dom.expand_button.show(); //"More.." link if no filters is hidden

        var that = this,
            filters = that.params.filters,
            wrapper = that.dom.filters,
            i = 1;

        // Append filters section with title and checkboxes
        for (var key in filters) {
            wrapper.append('<div class="odesk-filter odesk-widget-expand" style="display:block"><legend>' + filters[key].title + '</legend><ul class="odesk-filter-items ' + key + '"></ul></div>');
                var ul = wrapper.find(".odesk-filter-items." + key),
                    input_type = "checkbox";

            if (filters[key]['range']) {
                //key=param1-param2
                var range_params = filters[key].items,
                    min = that[range_params[0]] ? that[range_params[0]] : filters[key].min,
                    max = that[range_params[1]] ? that[range_params[1]] : filters[key].max;

                ul.append('<li><div class="range_title"><strong>' + filters[key].range_title + '</strong> <span>' + min + '-' + max + '</span></div><div min="' + range_params[0] + '" max="' + range_params[1] + '" class="range" id="range' + i + '"></div></li>');
                $( "#range" + i ).slider({
                    range: true,
                    min: filters[key].min,
                    max: filters[key].max,
                    values: [ min, max ],
                    step: filters[key].step,
                    slide: function( event, ui ) {
                        //update ui
                        that.root.find("div.range_title").children("span").html(ui.values[0] + "-" + ui.values[1]);
                        //update widget params
                        that[$(this).attr("min")] = ui.values[0] + '';
                        that[$(this).attr("max")] = ui.values[1] + '';
                        //refresh query
                        that.api_query();
                    }
                });
            } else {
                if (filters[key]["radio"])
                    input_type = "radio";

                for (var item in filters[key].items) {
                    // check if current filter value is present in widget init params
                    var checked = '';
                    if (that[key] == filters[key].items[item])
                        checked = 'checked="checked" ';
                    //append checkbox
                    ul.append('<li><input ' + checked + 'class="filter_option" id="filter' + i + '" name="' + key + '" type="' + input_type + '" value="' + filters[key].items[item] + '"><label for="filter' + i + '">' + item + '</label></li>');
                    i++;
            }
            }
        }

        // Disable all checked checkboxes
        //$('input.filter_option[checked="checked"]').attr('disabled', 'disabled');

        // Bind handler for checkboxes
        // Checkbox has name, api_params[name] and value=filter value
        $("input.filter_option").change(function() {
            var param = $(this).attr('name'),
                key = $(this).val(),
                new_val = $(this).attr('checked') ? key : "",
                val = that[param];

            if ($(this).attr('type') == "radio") {
                // this is radio button, just replace param value
                that[param] = new_val;
            } else {
                // checkbox - can be more that 1 selected
                if (val && val != "") { //widget already has filter by this param
                    if (typeof(val) == 'string') { // param value is string, not object, so convert it to object and append new value
                        that[param] = {}; // convert it to object and push old `string` value as member of it
                        that[param][val] = val;
                    }

                    that[param][key] = new_val;
                }
                else
                    that[param] = new_val;
            }

            //refresh query
            that.api_query();
        });
    },

    // -- FILTERS DEFINITIONS ------------------------------------------------

    available_filters: {
        'min-max': {
            'title': 'Hourly Rate',
            'range': true,
            'range_title': '$ per hour:',
            'min': 0,
            'max': 200,
            'step': 10,
            'items': ['min', 'max']
        },
        'fb': {
            'title': 'Feedback Score',
            'items': {
                'Any Score': '',
                'No Feedback Yet': 'no-feedback-scores',
                '4.5 - 5.0 Stars': '4.5 - 5.0 Stars',
                '4.0 - 4.5 Stars': '4.0 - 4.5 Stars',
                '3.0 - 3.9 Stars': '3.0 - 3.9 Stars',
                '2.0 - 2.9 Stars': '2.0 - 2.9 Stars',
                '1.0 - 1.9 Stars': '1.0 - 1.9 Stars'
            }
        },
        'hrs': {
            'title': 'Minimum Hours Billed',
            'items': {
                'Any Hours': '',
                '1 hour or $1 earned': '1-hour',
                '100+ Hours': '100-hours',
                '1000+ Hours': '1000-hours',
                'Within Last 6 Months only': 'yes'
            }
        },
        'rdy': {
            'title': 'Is oDesk Ready',
            'items': {
                'oDesk Ready': '1'
            }
        },
        't': {
            'title': 'Job Type',
            'radio': true,
            'items': {
                'All Types': '',
                'Hourly': 'Hourly',
                'Fixed-Price': 'Fixed'
            }
        },
        'wl': {
            'title': 'Workload',
            'items': {
                'As Needed < 10 Hours/Week': '0',
                'Part Time: 10-30 hrs/week': '10',
                'Full Time: 30+ hrs/week': '30'
            }
        }
    }
}
