define(['require',
        'handlebars',
        'text!faostat_ui_analysis_ghg_qa_qc/html/templates.hbs',
        'i18n!faostat_ui_analysis_ghg_qa_qc/nls/translate',
        'text!faostat_ui_analysis_ghg_qa_qc/config/chart_template.json',
        'faostat_commons',
        'FAOSTAT_UI_WIDE_TABLES',
        'wds_client',
        'fx-c-c/start',
        'sweetAlert',
        'chosen',
        'highcharts',
        'bootstrap'], function (Require, Handlebars, templates, translate, chart_template, FAOSTATCommons,
                                 WIDE_TABLES, WDSClient, CHARTS_CREATOR, swal) {

    'use strict';

    function GHG_QA_QC() {

        this.CONFIG = {
            lang: 'en',
            data: {},
            charts_data: {},
            lang_faostat: 'E',
            datasource: 'faostatdata',
            placeholder_id: 'faostat_ui_analysis_ghg_qaqc_placeholder',
            domains: [
                {id: 'gt', label: translate.gt, totals: ['1711', '1709', '5058', '6731', '5059', '6736', '5060'], color: '#009B77'},
                {id: 'ge', label: translate.ge, totals: ['5058'], color: '#9B2335'},
                {id: 'gm', label: translate.gm, totals: ['5059'], color: '#E15D44'},
                {id: 'gr', label: translate.gr, totals: ['5060'], color: '#EFC050'},
                {id: 'gas', label: translate.gas, totals: ['1709', '6722', '5064', '6734', '5056', '5057', '6735', '5061'], color: '#5B5EA6'},
                {id: 'gh', label: translate.gh, totals: ['6736'], color: '#C3447A'},
                {id: 'gb', label: translate.gb, totals: ['6731'], color: '#DD4124'}
            ],
            table_types: ['emissions', 'activity'],
            url_wds: 'http://localhost:8080/wds/rest',
            chart_width_big: 720,
            chart_width_small: 386,
            url_pdf: Require.toUrl('FAOSTAT_UI_ANALYSIS_GHG_QAQC_PDF'),
            charts_creator: null,
            url_wds_crud: 'http://fenixapps2.fao.org/wds_5.1/rest/crud'
        }

    }

    GHG_QA_QC.prototype.init = function(config) {

        /* Extend default configuration. */
        this.CONFIG = $.extend(true, {}, this.CONFIG, config);

        /* Fix the language, if needed. */
        this.CONFIG.lang = this.CONFIG.lang != null ? this.CONFIG.lang : 'en';

        /* Store FAOSTAT language. */
        this.CONFIG.lang_faostat = FAOSTATCommons.iso2faostat(this.CONFIG.lang);

        /* Initiate the WDS client. */
        this.CONFIG.w = new WDSClient({
            datasource: this.CONFIG.datasource,
            serviceUrl: this.CONFIG.url_wds_crud
        });

        /* Cast chart configuration to JSON object. */
        chart_template = $.parseJSON(chart_template);

        /* This... */
        var _this = this;

        /* Register partials. */
        Handlebars.registerPartial('verification_structure', $(templates).filter('#verification_structure').html());

        /* Load template. */
        var source = $(templates).filter('#faostat_ui_analysis_ghg_qaqc').html();
        var template = Handlebars.compile(source);
        var dynamic_data = {
            here_label: translate.here,
            domains: this.CONFIG.domains,
            qa_qc_label: translate.qa_qc,
            domain_label: translate.domains,
            land_use_label: translate.land_use,
            module_label: translate.ghg_quality,
            instructions: translate.instructions,
            please_select: translate.please_select,
            geographic_area_label: translate.areas,
            agriculture_label: translate.agriculture,
            verification_label: translate.verification,
            user_guide_label: translate.user_guide,
            page_under_construction_label: translate.page_under_construction
        };
        var html = template(dynamic_data);
        $('#' + this.CONFIG.placeholder_id).empty().html(html).css('padding', '0 15px 15px 15px');

        /* Bind user manual. */
        $('#user_guide_top').click(function() {
            _this.download_user_guide();
        });
        $('#user_guide_bottom').click(function() {
            _this.download_user_guide();
        });

        /* Make selectors 'sticky. */
        var affix_width = $('#selectors_holder').width();
        affix_width = '1000px';
        $('#selectors_holder').affix({
            offset: {
                top: 100
            }
        }).on('affixed.bs.affix', function (e) {
            $('#selectors_holder').width(affix_width);
        });

        /* Store JQuery selectors. */
        this.CONFIG.domains_selector = $('#domains');
        this.CONFIG.geo_selector = $('#geographic_areas');

        /* Populate countries. */
        this.populate_countries();

        /* On country change. */
        this.CONFIG.geo_selector.change(function() {

            /* Query DB, if needed. */
            _this.load_data(_this.CONFIG.geo_selector.val(), _this.get_selected_domain());

        });

        /* Domains selector. */
        this.CONFIG.domains_selector.chosen().change(function() {
            _this.load_tabs();
        });

        /* Create charts after domain has been rendered. */
        amplify.subscribe('domain_rendered', function(event_data) {

            /* Clear charts. */
            _this.clear_charts();

            /* Create charts. */
            _this.create_charts();

        });

        /* Create charts after domain has been rendered. */
        amplify.subscribe('charts_data_loaded', function(event_data) {

            /* Clear charts. */
            _this.clear_charts();

            /* Create charts. */
            _this.create_charts();

            /* Render tables. */
            _this.render_tables(_this.get_selected_domain());

        });

    };

    GHG_QA_QC.prototype.load_data = function(area_code, domain_code) {

        /* This... */
        var _this = this;

        /* Clear charts. */
        this.clear_charts();

        /* Query DB, if needed. */
        if (this.CONFIG.data[area_code] == null) {

            /* SQL Query. */
            var sql = _this.get_query(area_code);

            /* Query the DB. */
            this.CONFIG.w.retrieve({

                /* Define the query. */
                payload: {
                    query: this.get_query(area_code)
                },

                success: function (json) {

                    /* Initiate charts creator. */
                    _this.CONFIG.charts_creator = new CHARTS_CREATOR();
                    _this.CONFIG.charts_creator.init({
                        model: json,
                        adapter: {
                            filters: ['AreaCode', 'DomainCode', 'TableType', 'GUNFCode'],
                            xDimensions: 'Year'
                        },
                        onReady: function(creator) {
                            _this.CONFIG.charts_data = creator.adapter.chartObj;
                        }
                    });

                    /* Store data. */
                    _this.CONFIG.data[area_code] = json;

                    /* Render tables. */
                    _this.render_tables(domain_code);

                },

                error: function(a) {
                    swal({
                        html: true,
                        type: 'error',
                        text: a.responseText,
                        title: translate.error
                    });
                }

            });

        } else {

            /* Create charts. */
            this.create_charts();

            /* Render tables. */
            this.render_tables(domain_code);

        }

    };

    GHG_QA_QC.prototype.load_tabs = function() {

        /* This... */
        var _this = this;

        /* Domain type. */
        var domain_type = this.CONFIG.domains_selector.val();

        /* Load template. */
        var source = $(templates).filter('#tabs_' + domain_type).html();
        var template = Handlebars.compile(source);
        var dynamic_data = {
            domains: this.CONFIG.domains
        };
        var html = template(dynamic_data);
        $('#tabs_content').empty().html(html);

        /* Make the header sticky. */
        var affix_width = $('#sticky_tabs_header').width();
        affix_width = '1000px';
        $('#sticky_tabs_header').affix({
            offset: {
                top: 100
            }
        }).on('affixed.bs.affix', function (e) {
            $('#sticky_tabs_header').width(affix_width);
        });

        /* Select first tab. */
        $('a[href="#gt"]').tab('show');

        /* Load domains. */
        for (var i = 0 ; i < this.CONFIG.domains.length ; i++) {
            try {
                this.load_domain(this.CONFIG.domains[i].id)
            } catch (e) {

            }
        }

        /* Resize charts on tab change. */
        $('#domains_tab').on('shown.bs.tab', function (e) {

            for (var z = 0 ; z < _this.CONFIG.domains.length ; z++) {

                /* Domain code. */
                var domain_code = _this.CONFIG.domains[z].id;
                var doAnimation = false;
                var chart_width;

                /* Find all the chart divs: emissions. */
                var divs = $('[id$=' + '_' + domain_code + '_emissions' + ']');
                for (var i = 0; i < divs.length; i++) {
                    var id = divs[i].id;
                    chart_width = $.inArray(id.substring(0, id.indexOf('_')), _this.CONFIG.domains[z].totals) > -1 ? _this.CONFIG.chart_width_big : _this.CONFIG.chart_width_small;
                    try {
                        $('#' + id).highcharts().setSize(chart_width, 250, doAnimation);
                    } catch (e) {

                    }
                }

                /* Find all the chart divs: activity. */
                divs = $('[id$=' + '_' + domain_code + '_activity' + ']');
                for (i = 0; i < divs.length; i++) {
                    id = divs[i].id;
                    chart_width = $.inArray(id.substring(0, id.indexOf('_')), _this.CONFIG.domains[z].totals) > -1 ? _this.CONFIG.chart_width_big : _this.CONFIG.chart_width_small;
                    try {
                        $('#' + id).highcharts().setSize(chart_width, 250, doAnimation);
                    } catch (e) {

                    }
                }

            }

        });

        /* Fire event after domain is rendered. */
        amplify.publish('domain_rendered', {domain_code: 'NOT USED ANYMORE'});

    };

    GHG_QA_QC.prototype.load_domain = function(domain_code) {

        /* This... */
        var _this = this;

        /* Load template. */
        var source = $(templates).filter('#' + domain_code + '_structure').html();
        var template = Handlebars.compile(source);
        var dynamic_data = {
            gt_label: translate.gt,
            ge_label: translate.ge,
            gm_label: translate.gm,
            gr_label: translate.gr,
            gb_label: translate.gb,
            gh_label: translate.gh,
            gas_label: translate.gas,
            item_label: translate.item,
            rice_label: translate.rice,
            goats_label: translate.goats,
            sheep_label: translate.sheep,
            swine_label: translate.swine,
            maize_label: translate.maize,
            wheat_label: translate.wheat,
            charts_label: translate.charts,
            tables_label: translate.tables,
            horses_label: translate.horses,
            fertilizers_label: translate.gy,
            manure_soils_label: translate.gp,
            crop_residues_label: translate.ga,
            organic_soils_label: translate.gv,
            buffaloes_label: translate.buffaloes,
            emissions_label: translate.emissions,
            sugar_cane_label: translate.sugar_cane,
            mules_asses_label: translate.mules_asses,
            cattle_dairy_label: translate.cattle_dairy,
            activity_label: translate.emissions_activity,
            mu_label: translate.mu[domain_code],
            poultry_birds_label: translate.poultry_birds,
            camels_llamas_label: translate.camels_llamas,
            pasture_label: translate.pasture_paddock_manure,
            cattle_non_dairy_label: translate.cattle_non_dairy,
            indirect_soils_label: translate.indirect_emissions,
            direct_soils_label: translate.direct_soil_emissions,
            table_selector_label: translate.table_selector_label,
            data_not_available_label: translate.data_not_available,
            sticky_header_id: domain_code + '_sticky'
        };
        var html = template(dynamic_data);
        $('#' + domain_code).empty().html(html);

        /* Make selectors 'sticky. */
        var affix_width = $('.' + domain_code + '_sticky').width();
        /* TODO Make it adaptive. */
        var affix_width = '1000px';
        $('.' + domain_code + '_sticky').affix({
            offset: {
                top: 350
            }
        }).on('affixed.bs.affix', function (e) {
            $('.' + domain_code + '_sticky').width(affix_width);
        });

        /* Select first tab. */
        $('a[href="#' + domain_code + '_charts"]').tab('show');

        /* Table selector. */
        var table_selector = $('#' + domain_code + '_table_selector');
        table_selector.chosen().change(function() {
            _this.load_data(_this.CONFIG.geo_selector.val(), _this.get_selected_domain());
        });
        $('.chosen-container.chosen-container-single').css('width', '100%');

    };

    GHG_QA_QC.prototype.clear_charts = function() {

        /* Fetch selected area code. */
        var area_code = this.CONFIG.geo_selector.val();

        /* Iterate over domains. */
        for (var z = 0 ; z < this.CONFIG.domains.length ; z++) {

            /* Domain. */
            var domain_code = this.CONFIG.domains[z].id;

            /* Find all the chart divs: emissions. */
            var divs = $('[id$=' + '_' + domain_code + '_emissions' + ']');
            for (var i = 0; i < divs.length; i++) {

                /* Fetch item code and table type from the template ID's. */
                var item_code = divs[i].id.substring(0, divs[i].id.indexOf('_'));
                var table_type = divs[i].id.substring(1 + divs[i].id.lastIndexOf('_'));

                /* Clear previous charts. */
                $('#' + item_code + '_' + domain_code + '_emissions').empty().html('<i class="fa fa-spinner fa-spin fs-chart-row"></i>');

            }

        }

    };

    GHG_QA_QC.prototype.get_custom_chart_color = function(item_code) {
        for (var i = 0 ; i < this.CONFIG.domains.length ; i++)
            if (this.CONFIG.domains[i].totals[0] == item_code)
                return this.CONFIG.domains[i].color;
    };

    GHG_QA_QC.prototype.create_charts = function() {

        /* Fetch selected area code. */
        var area_code = this.CONFIG.geo_selector.val();

        /* Iterate over domains. */
        for (var z = 0 ; z < this.CONFIG.domains.length ; z++) {

            /* Domain. */
            var domain_code = this.CONFIG.domains[z].id;
            var color = this.CONFIG.domains[z].color;

            /* Find all the chart divs: emissions. */
            var divs = $('[id$=' + '_' + domain_code + '_emissions' + ']');
            for (var i = 0; i < divs.length; i++) {

                /* Fetch item code and table type from the template ID's. */
                var item_code = divs[i].id.substring(0, divs[i].id.indexOf('_'));
                var table_type = divs[i].id.substring(1 + divs[i].id.lastIndexOf('_'));

                /* Custom charts color for GT. */
                if (domain_code == 'gt')
                    color = this.get_custom_chart_color(item_code);

                /* Create series. */
                try {
                    this.CONFIG.charts_creator.render({
                        container: '#' + item_code + '_' + domain_code + '_emissions',
                        creator: {
                            chartObj: chart_template
                        },
                        adapter: {
                            xOrder: "ASC",
                            series: [
                                {
                                    filters: {
                                        'DomainCode': domain_code.toUpperCase(),
                                        'TableType': table_type,
                                        'GUNFCode': item_code
                                    },
                                    valueDimensions: 'GValue',
                                    type: 'line',
                                    color: color,
                                    name: translate.faostat,
                                    marker: {
                                        lineColor: color
                                    }
                                },
                                {
                                    filters: {
                                        'DomainCode': domain_code.toUpperCase(),
                                        'TableType': table_type,
                                        'GUNFCode': item_code
                                    },
                                    valueDimensions: 'GUNFValue',
                                    type: 'spline',
                                    color: color,
                                    name: translate.nc,
                                    marker: {
                                        lineColor: color,
                                        fillColor: color
                                    }
                                }
                            ]
                        }
                    });
                } catch (e) {

                }

            }

            /* Find all the chart divs: activity. */
            divs = $('[id$=' + '_' + domain_code + '_activity' + ']');
            for (i = 0; i < divs.length; i++) {

                /* Fetch item code and table type from the template ID's. */
                item_code = divs[i].id.substring(0, divs[i].id.indexOf('_'));
                table_type = divs[i].id.substring(1 + divs[i].id.lastIndexOf('_'));

                try {
                    this.CONFIG.charts_creator.render({
                        container: '#' + item_code + '_' + domain_code + '_activity',
                        creator: {
                            chartObj: chart_template
                        },
                        series: [
                            {
                                filters: {
                                    'DomainCode': domain_code.toUpperCase(),
                                    'TableType': table_type,
                                    'GUNFCode': item_code
                                },
                                valueDimensions: 'GValue',
                                type: 'line',
                                color: color,
                                name: translate.faostat,
                                marker: {
                                    lineColor: color
                                }
                            },
                            {
                                filters: {
                                    'DomainCode': domain_code.toUpperCase(),
                                    'TableType': table_type,
                                    'GUNFCode': item_code
                                },
                                valueDimensions: 'GUNFValue',
                                type: 'spline',
                                color: color,
                                name: translate.nc,
                                marker: {
                                    lineColor: color,
                                    fillColor: color
                                }
                            }
                        ]
                    });
                } catch (e) {

                }

            }

        }

    };

    GHG_QA_QC.prototype.is_null_series = function(series) {
        var nulls = 0;
        for (var i = 0 ; i < series.length ; i++)
            if (series[i][1] == null)
                nulls++;
        if (series.length == nulls)
            return true;
        return false;
    };

    /**
     * @param area_code
     * @param domain_code
     * @param table_type
     * @param item_code
     * @param x_dimension   Dimension to be plotted on the X axis
     * @param y_dimension   Dimension to be plotted on the Y axis
     * @returns {Array}
     *
     * This function creates an array of arrays to be plotted.
     */
    GHG_QA_QC.prototype.create_series = function(area_code, domain_code, table_type, item_code, x_dimension, y_dimension) {
        var s = [];
        try {
            var d = this.CONFIG.charts_data[area_code][domain_code][table_type][item_code];
            for (var i = d.length - 1; i >= 0; i--) {
                var x = isNaN(parseInt(d[i][x_dimension])) ? null : parseInt(d[i][x_dimension]);
                var y = isNaN(parseFloat(d[i][y_dimension])) ? null : parseFloat(d[i][y_dimension]);
                s.push([x, y]);
            }
        } catch (e) {

        }
        return s;
    };

    GHG_QA_QC.prototype.register_chart_series = function(chart_series, domain_code, item_code, table_type) {
        if (chart_series.length > 0) {
            if (this.CONFIG.charts_data[domain_code] == null)
                this.CONFIG.charts_data[domain_code] = {};
            if (this.CONFIG.charts_data[domain_code][item_code] == null)
                this.CONFIG.charts_data[domain_code][item_code] = {};
            if (this.CONFIG.charts_data[domain_code][item_code][table_type] == null)
                this.CONFIG.charts_data[domain_code][item_code][table_type] = {};
            this.CONFIG.charts_data[domain_code][item_code][table_type] = chart_series;
        }
    };

    GHG_QA_QC.prototype.render_tables = function(domain_code) {

        /* Table type. */
        var table_type = $('#' + domain_code + '_table_selector').val();
        var isEmissions = table_type == 'emissions';

        try {

            /* Load template (same template for both emissions and activity). */
            var source = $(templates).filter('#tables_emissions').html();
            var template = Handlebars.compile(source);
            var dynamic_data = {
                id: domain_code,
                nc_label: translate.nc,
                isEmissions: isEmissions,
                co2eq_label: translate.co2eq,
                faostat_label: translate.faostat,
                mu_label: translate.mu[domain_code],
                difference_label: translate.difference,
                sticky_header_id: domain_code + '_sticky',
                export_data_label: translate.export_data_label,
                norm_difference_label: translate.norm_difference
            };
            var html = template(dynamic_data);
            $('#' + domain_code + '_tables_content').empty().html(html);

            /* Populate tables. */
            this.populate_tables(this.CONFIG.geo_selector.val());

        } catch (e) {

        }

    };

    GHG_QA_QC.prototype.get_query = function(area_code) {
        return  'SELECT DomainCode, Year, UNFCCCCode, GUNFItemName' + this.CONFIG.lang_faostat + ', ' +
                       'GUNFValue, GUNFCode, GValue, PerDiff, ' +
                       'NormPerDiff, TableType ' +
                'FROM DataUNFCCC ' +
                'WHERE AreaCode = \'' + area_code + '\' ' +
                'AND Year >= 1990 AND Year <= 2012 ' +
                'AND GUNFCode IS NOT NULL ' +
                'ORDER BY UNFCCCCode, Year DESC';
    };

    GHG_QA_QC.prototype.populate_countries = function() {

        /* This... */
        var _this = this;

        /* Config WDS. */
        var rest_config = {
            domain: 'GT',
            tab_group: 1,
            tab_index: 1,
            datasource: this.CONFIG.datasource,
            lang_faostat: this.CONFIG.lang_faostat
        };

        /* Fetch data and populate the dropdown. */
        this.CONFIG.w.wdsclient('procedures/usp_GetListBox', rest_config, function(json) {

            /* Initiate options. */
            var s = '<option value="null"></option>';

            /* Iterate over results. */
            for (var i = 0 ; i < json.length ; i++)
                s += '<option value="' + json[i][0] + '">' + json[i][1] + '</option>';

            /* Populate dropdown and define change listener. */
            _this.CONFIG.geo_selector.html(s).chosen();

        }, this.CONFIG.url_wds);

    };

    GHG_QA_QC.prototype.get_selected_domain = function() {
        return $($('#domains_tab').find('ul').find('li.active').find('a')[0]).attr('aria-controls');
    };

    GHG_QA_QC.prototype.populate_tables = function(area_code) {

        /* GT, GAS. */
        var a = ['gt', 'gas'];

        /* Populate tables. */
        for (var i = 0 ; i < this.CONFIG.domains.length ; i++) {
            if ($.inArray(this.CONFIG.domains[i].id, a) < 0) {
                this.populate_domain(this.CONFIG.domains[i].id, area_code, $('#' + this.CONFIG.domains[i].id + '_table_selector').val())
            } else {
                this.populate_domain_gt_gas(this.CONFIG.domains[i].id, area_code, $('#' + this.CONFIG.domains[i].id + '_table_selector').val())
            }
        }

    };

    GHG_QA_QC.prototype.populate_domain_gt_gas = function(domain_code, area_code, table_type) {

        /* Find codes for the bottom row, if any. */
        var bottom_row_codes;
        for (var i = 0 ; i < this.CONFIG.domains.length ; i++) {
            if (this.CONFIG.domains[i].id == domain_code) {
                /* Add only ONE total for tables, the first. Other values are used for charts width. */
                bottom_row_codes = [this.CONFIG.domains[i].totals[0]];
                break;
            }
        }

        /* Common configuration. */
        var wt_config = {
            row_code: 'UNFCCCCode',
            show_row_code: true,
            cols_dimension: 'Year',
            lang: this.CONFIG.lang,
            row_label: 'GUNFItemName' + this.CONFIG.lang_faostat,
            sort_by: 'code',
            prefix: domain_code + '_'
        };

        /* Data for tables. */
        var table_values = [];
        for (i = 0 ; i < this.CONFIG.data[area_code].length ; i++) {
            if (this.CONFIG.data[area_code][i].DomainCode == domain_code.toUpperCase() &&
                this.CONFIG.data[area_code][i].TableType == table_type)
                table_values.push(this.CONFIG.data[area_code][i]);
        }

        /* Initiate wide tables library. */
        var wt_1 = new WIDE_TABLES();
        var wt_2 = new WIDE_TABLES();
        var wt_3 = new WIDE_TABLES();
        var wt_4 = new WIDE_TABLES();

        /* Configure tables. */
        var wt_1_config = $.extend(true, {}, wt_config, {
            data: table_values,
            value_dimension: 'GValue',
            placeholder_id: domain_code + '_table_1',
            bottom_row_codes: bottom_row_codes
        });
        var wt_2_config = $.extend(true, {}, wt_config, {
            data: table_values,
            value_dimension: 'GUNFValue',
            placeholder_id: domain_code + '_table_2',
            bottom_row_codes: bottom_row_codes
        });
        var wt_3_config = $.extend(true, {}, wt_config, {
            data: table_values,
            value_dimension: 'PerDiff',
            placeholder_id: domain_code + '_table_3',
            color_values: true
        });
        var wt_4_config = $.extend(true, {}, wt_config, {
            data: table_values,
            value_dimension: 'NormPerDiff',
            placeholder_id: domain_code + '_table_4',
            color_values: true
        });

        /* Render tables. */
        wt_1.init(wt_1_config);
        wt_2.init(wt_2_config);
        wt_3.init(wt_3_config);
        wt_4.init(wt_4_config);

        /* Synchronize scrollbars. */
        for (i = 1 ; i < 5 ; i++) {
            var id = '#' + domain_code + '_table_' + i +'_scroll';
            $(id).scroll(function() {
                $(".wide_tables_scroll").scrollLeft($('#' + this.id).scrollLeft());
            });
        }

        /* Bind export buttons. */
        $('#' + domain_code + '_export_table_1').click(function() {
            wt_1.export_table(translate[domain_code] + ' (' + translate.faostat + ' [' + table_type + '])', translate.faostat);
        });
        $('#' + domain_code + '_export_table_2').click(function() {
            wt_2.export_table(translate[domain_code] + ' (' + translate.nc + ' [' + table_type + '])', translate.nc);
        });
        $('#' + domain_code + '_export_table_3').click(function() {
            wt_3.export_table(translate[domain_code] + ' (' + translate.difference + ' [' + table_type + '])', translate.diff);
        });
        $('#' + domain_code + '_export_table_4').click(function() {
            wt_4.export_table(translate[domain_code] + ' (' + translate.norm_difference + '[' + table_type + '])', translate.norm_difference);
        });

        /* Indent GAS labels. */
        if (domain_code == 'gas') {
            $("td[id='4.D.1']").html('<div class="single-margin">4.D.1</div>');
            $("td[id='4.D.1.1']").html('<div class="double-margin">4.D.1.1</div>');
            $("td[id='4.D.1.2']").html('<div class="double-margin">4.D.1.2</div>');
            $("td[id='4.D.1.4']").html('<div class="double-margin">4.D.1.4</div>');
            $("td[id='4.D.1.5']").html('<div class="double-margin">4.D.1.5</div>');
            $("td[id='4.D.2']").html('<div class="single-margin">4.D.2</div>');
            $("td[id='4.D.3']").html('<div class="single-margin">4.D.3</div>');
        }

    };

    GHG_QA_QC.prototype.populate_domain = function(domain_code, area_code, table_type) {

        /* Find codes for the bottom row, if any. */
        var bottom_row_codes;
        for (var i = 0 ; i < this.CONFIG.domains.length ; i++) {
            if (this.CONFIG.domains[i].id == domain_code) {
                /* Add only ONE total for tables, the first. Other values are used for charts width. */
                bottom_row_codes = [this.CONFIG.domains[i].totals[0]];
                break;
            }
        }

        /* Common configuration. */
        var wt_config = {
            row_code: 'GUNFCode',
            show_row_code: domain_code == 'gt' || domain_code == 'gas',
            cols_dimension: 'Year',
            lang: this.CONFIG.lang,
            row_label: 'GUNFItemName' + this.CONFIG.lang_faostat,
            prefix: domain_code + '_'
        };

        /* Data for tables. */
        var table_values = [];
        for (i = 0 ; i < this.CONFIG.data[area_code].length ; i++) {
            if (this.CONFIG.data[area_code][i].DomainCode == domain_code.toUpperCase() &&
                this.CONFIG.data[area_code][i].TableType == table_type)
                table_values.push(this.CONFIG.data[area_code][i]);
        }

        /* Initiate wide tables library. */
        var wt_1 = new WIDE_TABLES();
        var wt_2 = new WIDE_TABLES();
        var wt_3 = new WIDE_TABLES();
        var wt_4 = new WIDE_TABLES();

        /* Configure tables. */
        var wt_1_config = $.extend(true, {}, wt_config, {
            data: table_values,
            value_dimension: 'GValue',
            placeholder_id: domain_code + '_table_1',
            bottom_row_codes: bottom_row_codes
        });
        var wt_2_config = $.extend(true, {}, wt_config, {
            data: table_values,
            value_dimension: 'GUNFValue',
            placeholder_id: domain_code + '_table_2',
            bottom_row_codes: bottom_row_codes
        });
        var wt_3_config = $.extend(true, {}, wt_config, {
            data: table_values,
            value_dimension: 'PerDiff',
            placeholder_id: domain_code + '_table_3',
            color_values: true
        });
        var wt_4_config = $.extend(true, {}, wt_config, {
            data: table_values,
            value_dimension: 'NormPerDiff',
            placeholder_id: domain_code + '_table_4',
            color_values: true
        });

        /* Render tables. */
        wt_1.init(wt_1_config);
        wt_2.init(wt_2_config);
        wt_3.init(wt_3_config);
        wt_4.init(wt_4_config);

        /* Synchronize scrollbars. */
        for (i = 1 ; i < 5 ; i++) {
            var id = '#' + domain_code + '_table_' + i +'_scroll';
            $(id).scroll(function() {
                $(".wide_tables_scroll").scrollLeft($('#' + this.id).scrollLeft());
            });
        }

        /* Bind export buttons. */
        $('#' + domain_code + '_export_table_1').click(function() {
            wt_1.export_table(translate[domain_code] + ' (' + translate.faostat + ' [' + table_type + '])', translate.faostat);
        });
        $('#' + domain_code + '_export_table_2').click(function() {
            wt_2.export_table(translate[domain_code] + ' (' + translate.nc + ' [' + table_type + '])', translate.nc);
        });
        $('#' + domain_code + '_export_table_3').click(function() {
            wt_3.export_table(translate[domain_code] + ' (' + translate.difference + ' [' + table_type + '])', translate.diff);
        });
        $('#' + domain_code + '_export_table_4').click(function() {
            wt_4.export_table(translate[domain_code] + ' (' + translate.norm_difference + '[' + table_type + '])', translate.norm_difference);
        });

    };

    GHG_QA_QC.prototype.download_user_guide = function() {
        var pdf_url = this.CONFIG.url_pdf + this.CONFIG.lang_faostat + '/user_guide.pdf';
        window.open(pdf_url, '_blank');
    };

    return GHG_QA_QC;

});