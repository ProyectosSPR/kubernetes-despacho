/** @odoo-module **/

import { renderToElement, renderToString } from "@web/core/utils/render";
import { _t } from "@web/core/l10n/translation";
import { listenSizeChange, utils as uiUtils } from "@web/core/ui/ui_service";
import publicWidget from '@web/legacy/js/public/public_widget';

const MONTHS_LONG = [
    _t("January"),
    _t("February"),
    _t("March"),
    _t("April"),
    _t("May"),
    _t("June"),
    _t("July"),
    _t("August"),
    _t("September"),
    _t("October"),
    _t("November"),
    _t("December"),
  ];

const MONTHS_SHORT = [
    _t("Jan"),
    _t("Feb"),
    _t("Mar"),
    _t("Apr"),
    _t("May"),
    _t("Jun"),
    _t("Jul"),
    _t("Aug"),
    _t("Sep"),
    _t("Oct"),
    _t("Nov"),
    _t("Dec"),
  ];

const DAYS_NEEDED_FOR_MONTH = 42;

publicWidget.registry.appointmentRange = publicWidget.Widget.extend({
    selector: '.widget_appointmentrange',
    events: {
        'focus': '_onFocusDateRange',
    },

    init: function () {
        this._super.apply(this, arguments);
    },

    start() {
        this.$inputDateRange = this.$el;
        this.$inputForm = this.$inputDateRange.closest('form');
        this.$popupDateRange = null;

        this.header_height = $('#top')[0].clientHeight;

        let range_start = this.$inputDateRange.data('range-start');
        let range_end = this.$inputDateRange.data('range-end');
        let current_date = new Date();
        let last_day = this.last_possible_date_for_range(current_date);
        let start_day = false;
        let end_day = false;
        let month_offset = current_date.getMonth();
        let month_start = 1;

        range_start = new Date(range_start);
        range_end = new Date(range_end);

        if (!(isNaN(range_start) || isNaN(range_end) || range_start < current_date ||
                range_end < current_date || range_start > last_day || range_end > last_day || range_start == range_end)) {
            let day_offset = this.get_day_of_week(range_start.getFullYear(), range_start.getMonth() + 1, 1) - 1;
            start_day = {
                month: range_start.getMonth() + 1 - month_offset,
                day: range_start.getDate() + day_offset,
                real_year: range_start.getFullYear(),
                real_month: range_start.getMonth() + 1,
                real_day: range_start.getDate(),
            }

            day_offset = this.get_day_of_week(range_end.getFullYear(), range_end.getMonth() + 1, 1) - 1;
            end_day = {
                month: range_end.getMonth() + 1 - month_offset,
                day: range_end.getDate() + day_offset,
                real_year: range_end.getFullYear(),
                real_month: range_end.getMonth() + 1,
                real_day: range_end.getDate(),
            }

            month_start = start_day.month
        }

        this.init_daterange(month_start, month_offset, start_day, end_day);
        this.$inputDateRange.val(this.dr_as_string());

        $(document).on('click focusin', this._onOutsideInteraction.bind(this));
        $(window).on('resize', this._onWindowResize.bind(this));

        return this._super.apply(this, arguments);
    },

    destroy() {

        $(window).off('resize', this._onWindowResize.bind(this));
        $(document).off('click focusin', this._onOutsideInteraction.bind(this));

        this._super(...arguments);
    },

    get_days_in_month(year, month) {

        return new Date(year, month, 0).getDate();
    },

    get_day_of_week(year, month, day) {
        let date = new Date(year, month - 1, day);

        // Get the day of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
        let day_of_week = date.getDay();
        // Convert: 1 = Monday, 2 = Thuesday, ..., 7 = Sunday
        if (day_of_week == 0) {
            return 7
        } else {
            return day_of_week
        }
    },

    prepare_day_properies(day, days_in_month, day_offset, year, month) {
        const real_day = day - day_offset;
        const current_date = new Date();
        const current_year = current_date.getFullYear();
        const current_month = current_date.getMonth() + 1;
        const current_day = current_date.getDate();

        return {
            day: day,
            real_day: real_day,
            possible: ((year == current_year) && (month == current_month) && (real_day < current_day)) ||
                ((year == current_year) && (month < current_month))
                    || (year < current_year) ? false : true,
            range_start: false,
            range_end: false,
            visible: (real_day <= days_in_month) && (real_day > 0) ? true : false,
        }
    },

    real_year_month(start_month, month_offset) {
        let current_date = new Date();
        let year_left = current_date.getFullYear();
        let real_month_left = start_month + month_offset;
        let year_right = current_date.getFullYear();
        let real_month_right = start_month + month_offset + 1;

        if (real_month_left > 12) {
            year_left++;
            real_month_left -= 12;
        }

        if (real_month_right > 12) {
            year_right++;
            real_month_right -= 12;
        }

        return {
            year_left: year_left,
            year_right: year_right,
            month_left: real_month_left,
            month_right: real_month_right
        }
    },

    last_possible_date_for_range(d) {

        // Extract the year and month from the original date
        const year = d.getFullYear();
        const month = d.getMonth(); // 0-based (0 = January)

        // Calculate the new month and year
        const newMonth = month + 11; // Add 11 months
        const newYear = year + Math.floor(newMonth / 12); // Adjust the year if needed

        // Use the remainder for the month, ensuring it's 0-based
        const adjustedMonth = newMonth % 12;

        // Create a date for the 1st day of the following month
        const firstDayOfNextMonth = new Date(newYear, adjustedMonth + 1, 1);

        // Subtract one day to get the last day of the new month
        const lastDayOfNewMonth = new Date(firstDayOfNextMonth - 1);

        return lastDayOfNewMonth;
    },

    init_daterange(month_start, month_offset, day_start, day_end) {

        let real_year_month = this.real_year_month(month_start, month_offset);

        let days_left = [];
        let days_right = [];

        let days_in_month_left = this.get_days_in_month(real_year_month.year_left, real_year_month.month_left);
        let day_left_offset = this.get_day_of_week(real_year_month.year_left, real_year_month.month_left, 1) - 1;
        let days_in_month_right = this.get_days_in_month(real_year_month.year_right, real_year_month.month_right);
        let day_right_offset = this.get_day_of_week(real_year_month.year_right, real_year_month.month_right, 1) - 1;

        let list = Array.from({ length: DAYS_NEEDED_FOR_MONTH }, (_, i) => (this.prepare_day_properies(i + 1, days_in_month_left, day_left_offset, real_year_month.year_left, real_year_month.month_left)));

        for (let i = 0; i < list.length; i += 7) {
            days_left.push(list.slice(i, i + 7));
        }

        list = Array.from({ length: DAYS_NEEDED_FOR_MONTH }, (_, i) => (this.prepare_day_properies(i + 1, days_in_month_right, day_right_offset, real_year_month.year_right, real_year_month.month_right)));

        for (let i = 0; i < list.length; i += 7) {
            days_right.push(list.slice(i, i + 7));
        }

        this.data_daterange = { month_start: month_start,
                                month_offset: month_offset,
                                real_year_month: real_year_month,

                                month_left: MONTHS_LONG[real_year_month.month_left - 1],
                                month_left_more: month_start > 1 ? true : false,

                                month_right: MONTHS_LONG[real_year_month.month_right - 1],
                                month_right_more: (((month_start + 1) < 12) && !uiUtils.isSmall()) || (((month_start) < 12) && uiUtils.isSmall()) ? true : false,

                                days_left: days_left,
                                day_left_offset: day_left_offset,

                                days_right: days_right,
                                day_right_offset: day_right_offset,

                                day_start: day_start,
                                day_end: day_end }
    },

    init_occupancy(adults, children) {

        this.data_occupancy = {
            adults: adults,
            children: children,
        }
    },

    dr_as_string() {
        const data = this.data_daterange;

        if (!data.day_start || !data.day_end) {
            return ''
        }

        const nights = this.getDateRangeNights(data.day_start, data.day_end);
        const nights_keyword = nights == 1 ? _t('night') : _t('nights');

        let dr = '';

        if (!nights) {
            dr = data.day_start.real_day.toString() + '/' + data.day_start.real_month.toString() + '/' + data.day_start.real_year.toString()
        } else {
            dr = data.day_start.real_day.toString() + ' ' + MONTHS_SHORT[data.day_start.real_month - 1] + ' - ' +
                            data.day_end.real_day.toString() + ' ' + MONTHS_SHORT[data.day_end.real_month - 1]
        }
        return dr
    },

    _onFocusDateRange(event) {
        if (!this.$popupDateRange) {

            const data = this.data_daterange;

            if (this.$inputDateRange.val()) {
                try {
                    const [day, month, year] = this.$inputDateRange.val().split('/').map(Number);
                    data.day_start = {
                        month: false,
                        day: false,
                        real_year: year,
                        real_month: month,
                        real_day: day,
                    }
                    data.day_end = {
                        month: false,
                        day: false,
                        real_year: year,
                        real_month: month,
                        real_day: day,
                    }
                } catch(error) {
                }
            }

            this.$popupDateRange = this.openPopover(event.currentTarget,
                                                    { data: this.data_daterange,
                                                      onLeftDateRange: this.onLeftDateRange.bind(this),
                                                      onRightDateRange: this.onRightDateRange.bind(this),
                                                      onSelectDateRange: this.onSelectDateRange.bind(this),
                                                      onDone: this.onDone.bind(this)});
            this.updateDateRangeSelection()
        }
    },

    getDateRangeNights(start, end) {
        if (start && end) {
            start = new Date(start.real_year, start.real_month - 1, start.real_day);
            end = new Date(end.real_year, end.real_month - 1, end.real_day);
            const dif = end - start;
            const nights = dif / (1000 * 60 * 60 * 24);

            return nights > 0 ? Math.floor(nights) : 0;
        } else {
            return 0
        }
    },

    updateDateRangeMonth() {
        this.data_daterange.month_left = MONTHS_LONG[this.data_daterange.real_year_month.month_left - 1];
        if (this.data_daterange.real_year_month.year_left != this.data_daterange.real_year_month.year_right) {
            this.data_daterange.month_right = MONTHS_LONG[this.data_daterange.real_year_month.month_right - 1] +
                                                  ' ' + this.data_daterange.real_year_month.year_right.toString()
        } else {
            this.data_daterange.month_right = MONTHS_LONG[this.data_daterange.real_year_month.month_right - 1]
        }

        let $month_left = this.$popupDateRange.find('.popover-month-left');
        let $month_right = this.$popupDateRange.find('.popover-month-right');

        $month_left.find('.popover-show-month').text(this.data_daterange.month_left);
        $month_right.find('.popover-show-month').text(this.data_daterange.month_right);
    },

    updateDateRangeDays() {

        const data = this.data_daterange;
        const $left = this.$popupDateRange.find('.popover-month-left');
        const $right = this.$popupDateRange.find('.popover-month-right');

        this.$popupDateRange.find('.popover-days').find('.hidden').removeClass('hidden');
        this.$popupDateRange.find('.popover-days').find('.impossible').removeClass('impossible');
        for (let i = 0; i < data.days_left.length; i++) {
            for (let j = 0; j < data.days_left[i].length; j++) {
                let $day = $left.find('.popover-day-' + data.days_left[i][j].day.toString());
                $day.text(data.days_left[i][j].real_day);
                $day.data('real-day', data.days_left[i][j].real_day);

                if (!data.days_left[i][j].visible) {
                    $day.addClass('hidden')
                }
                else if (!data.days_left[i][j].possible) {
                    $day.addClass('impossible')
                }

                $day = $right.find('.popover-day-' + data.days_right[i][j].day.toString());
                $day.text(data.days_right[i][j].real_day);
                $day.data('real-day', data.days_right[i][j].real_day);
                if (!data.days_right[i][j].visible) {
                    $day.addClass('hidden')
                } else if (!data.days_right[i][j].possible) {
                    $day.addClass('impossible')
                }
            }
        }
    },

    updateDateRangeNavigation() {
        if (this.data_daterange.month_start <= 1) {
            this.data_daterange.month_left_more = false;
            this.$popupDateRange.find('.popover-arrow-left').addClass('hidden');
        } else {
            this.data_daterange.month_left_more = true;
            this.$popupDateRange.find('.popover-arrow-left').removeClass('hidden');
        }

        const month_end = uiUtils.isSmall() ? 12 : 11;
        if (this.data_daterange.month_start >= month_end) {
            this.data_daterange.month_right_more = false;
            this.$popupDateRange.find('.popover-arrow-right').addClass('hidden');
        } else {
            this.data_daterange.month_right_more = true;
            this.$popupDateRange.find('.popover-arrow-right').removeClass('hidden');
        }
    },

    updateDateRangeSelection() {

        const data = this.data_daterange;

        this.$popupDateRange.find('.popover-days').find('.selected').removeClass('selected');
        this.$popupDateRange.find('.popover-days').find('.included').removeClass('included');

        if (data.day_start && (data.day_start.month == data.month_start)) {
            this.$popupDateRange.find('.popover-month-left').find('.popover-day-' + data.day_start.day.toString()).addClass('selected')
        }
        if (data.day_end && (data.day_end.month == data.month_start)) {
            this.$popupDateRange.find('.popover-month-left').find('.popover-day-' + data.day_end.day.toString()).addClass('selected')
        }
        if (data.day_start && (data.day_start.month == data.month_start + 1)) {
            this.$popupDateRange.find('.popover-month-right').find('.popover-day-' + data.day_start.day.toString()).addClass('selected')
        }
        if (data.day_end && (data.day_end.month == data.month_start + 1)) {
            this.$popupDateRange.find('.popover-month-right').find('.popover-day-' + data.day_end.day.toString()).addClass('selected')
        }

        if (data.day_start && data.day_end) {
            if ((data.day_start.month == data.day_end.month)) {
                let showRange = false;
                if ((data.day_start.month == data.month_start)) {
                    showRange = '.popover-month-left';
                } else if ((data.day_start.month == data.month_start + 1)) {
                    showRange = '.popover-month-right';
                }
                if (showRange) {
                    for (let i = data.day_start.day; i <= data.day_end.day; i++) {
                        const $day = this.$popupDateRange.find(showRange).find('.popover-day-' + i.toString());
                        if (!$day.hasClass('selected')) {
                            $day.addClass('included')
                        }
                    }
                }
            } else {
                if ((data.day_start.month >= data.month_start) && (data.day_start.month <= data.month_start + 1)) {
                    const showRange = data.day_start.month == data.month_start ? '.popover-month-left' : '.popover-month-right';
                    for (let i = data.day_start.day; i <= DAYS_NEEDED_FOR_MONTH; i++) {
                        const $day = this.$popupDateRange.find(showRange).find('.popover-day-' + i.toString());
                        if (!$day.hasClass('selected')) {
                            $day.addClass('included')
                        }
                    }
                    if ((data.day_start.month == data.month_start) && (data.day_end.month > data.month_start + 1)) {
                        for (let i = 1; i <= DAYS_NEEDED_FOR_MONTH; i++) {
                            const $day = this.$popupDateRange.find('.popover-month-right').find('.popover-day-' + i.toString());
                            if (!$day.hasClass('selected')) {
                                $day.addClass('included')
                            }
                        }
                    }
                }
                if ((data.day_end.month >= data.month_start) && (data.day_end.month <= data.month_start + 1)) {
                    const showRange = data.day_end.month == data.month_start ? '.popover-month-left' : '.popover-month-right';
                    for (let i = data.day_end.day; i >= 1; i--) {
                        const $day = this.$popupDateRange.find(showRange).find('.popover-day-' + i.toString());
                        if (!$day.hasClass('selected')) {
                            $day.addClass('included')
                        }
                    }
                    if ((data.day_end.month == data.month_start + 1) && (data.day_start.month < data.month_start)) {
                        for (let i = 1; i <= DAYS_NEEDED_FOR_MONTH; i++) {
                            const $day = this.$popupDateRange.find('.popover-month-left').find('.popover-day-' + i.toString());
                            if (!$day.hasClass('selected')) {
                                $day.addClass('included')
                            }
                        }
                    }
                }
                if ((data.day_start.month < data.month_start) && (data.day_end.month > data.month_start + 1)) {
                    for (let i = 1; i <= DAYS_NEEDED_FOR_MONTH; i++) {
                        const $day = this.$popupDateRange.find('.popover-day-' + i.toString());
                        $day.addClass('included')
                    }
                }
            }

            this.$inputDateRange.val(this.dr_as_string());
            this.$inputDateRange.data('range-start', data.day_start.real_year.toString() + '-' +
                                                         data.day_start.real_month.toString() + '-' +
                                                             data.day_start.real_day.toString());
            this.$inputDateRange.data('range-end', data.day_end.real_year.toString() + '-' +
                                                         data.day_end.real_month.toString() + '-' +
                                                             data.day_end.real_day.toString());
            if (this.$inputDateRange.data('use-hidden')) {
                let hiddenInput = this.$inputForm.find('input[name="' + this.$inputDateRange.data('use-hidden') + '"]');

                if (hiddenInput) {
                    let value = data.day_start.real_year.toString() + '-' +
                                    data.day_start.real_month.toString() + '-' +
                                        data.day_start.real_day.toString() + ',' +
                                            data.day_end.real_year.toString() + '-' +
                                                data.day_end.real_month.toString() + '-' +
                                                    data.day_end.real_day.toString();
                    hiddenInput.val(value)
                }
            }
        } else {
            this.$inputDateRange.val('');
            this.$inputDateRange.data('range-start', '');
            this.$inputDateRange.data('range-end', '');
            if (this.$inputDateRange.data('use-hidden')) {
                let hiddenInput = this.$inputForm.find('input[name="' + this.$inputDateRange.data('use-hidden') + '"]');
                hiddenInput.val('')
            }
        }
    },

    onDone () {
        if (this.$popupDateRange) {
            this.$popupDateRange.remove();
            this.$popupDateRange = null
        }
    },

    onLeftDateRange () {
        if (this.data_daterange.month_start > 1) {
            this.data_daterange.month_start--;

            this.init_daterange(this.data_daterange.month_start,
                                this.data_daterange.month_offset,
                                this.data_daterange.day_start,
                                this.data_daterange.day_end);

            this.updateDateRangeMonth();
            this.updateDateRangeDays();
            this.updateDateRangeNavigation();
            this.updateDateRangeSelection();
        }
    },

    onRightDateRange () {
        const month_end = uiUtils.isSmall() ? 12 : 11;

        if (this.data_daterange.month_start < month_end) {
            this.data_daterange.month_start++;

            this.init_daterange(this.data_daterange.month_start,
                                this.data_daterange.month_offset,
                                this.data_daterange.day_start,
                                this.data_daterange.day_end);

            this.updateDateRangeMonth();
            this.updateDateRangeDays();
            this.updateDateRangeNavigation();
            this.updateDateRangeSelection();
        }
    },

    onSelectDateRange (event) {
        const data = this.data_daterange;
        const $target = $(event.target);
        const month = $target.data('month') === 'left' ? data.month_start : data.month_start + 1;
        const real_month = $target.data('month') === 'left' ? this.data_daterange.real_year_month.month_left : this.data_daterange.real_year_month.month_right;
        const real_year = $target.data('month') === 'left' ? this.data_daterange.real_year_month.year_left : this.data_daterange.real_year_month.year_right;
        const day = $target.data('day');
        const real_day = $target.data('real-day');

        data.day_end = {
            month: month,
            day: day,
            real_year: real_year,
            real_month: real_month,
            real_day: real_day,
        }

        data.day_start = {
            month: month,
            day: day,
            real_year: real_year,
            real_month: real_month,
            real_day: real_day,
        }

        this.updateDateRangeSelection();

        this.$popupDateRange.remove();
        this.$popupDateRange = null;

        this.$inputDateRange.get(0).dispatchEvent(new Event("change", { bubbles: true }))
    },

    openPopover(target, extra_params) {
        if (uiUtils.isSmall()) {
            const template = 'snippet_daterange.WidgetDateRangePickerMobile';

            let $wrap = $('#wrap');

            let rect = target.getBoundingClientRect();
            let wrapRect = $wrap[0].getBoundingClientRect();
            let left = 0;
            let top = rect.bottom - wrapRect.top + wrap.scrollTop + this.header_height;

            let params = { top: `${top}px`,
                           left: `${left}px` }

            if (extra_params && typeof extra_params === 'object' && !Array.isArray(extra_params)) {
                Object.assign(params, extra_params);
            }

            const $popover = $(renderToElement(template, params));

            $wrap.append($popover[0]);
            return $popover
        } else {
            const template = 'snippet_daterange.WidgetDateRangePicker';

            let $wrap = $('#wrap');

            let rect = target.getBoundingClientRect();
            let wrapRect = $wrap[0].getBoundingClientRect();
            let left = rect.left - wrapRect.left + wrap.scrollLeft;
            let top = rect.bottom - wrapRect.top + wrap.scrollTop + this.header_height;

            let params = { top: `${top}px`,
                           left: `${left}px` }

            if (extra_params && typeof extra_params === 'object' && !Array.isArray(extra_params)) {
                Object.assign(params, extra_params);
            }

            const $popover = $(renderToElement(template, params));

            $wrap.append($popover[0]);

            return $popover;
        }
    },

    _onOutsideInteraction: function (event) {

        if (this.$popupDateRange) {
            const popover = this.$popupDateRange;
            const target = $(event.target);

            if (!popover.is(target) && !popover.has(target).length && !this.$el.is(target) && !this.$el.has(target).length) {
                this.$popupDateRange.remove();
                this.$popupDateRange = null
            }
        }
    },

    _onWindowResize: function () {
        if (this.$popupDateRange) {

            this.$popupDateRange.remove();
            this.$popupDateRange = this.openPopover(this.el,
                                                    { data: this.data_daterange,
                                                      onLeftDateRange: this.onLeftDateRange.bind(this),
                                                      onRightDateRange: this.onRightDateRange.bind(this),
                                                      onSelectDateRange: this.onSelectDateRange.bind(this),
                                                      onDone: this.onDone.bind(this)});
            this.updateDateRangeSelection()
        }
    },
});
