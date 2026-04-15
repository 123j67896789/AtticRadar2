const armFunctions = require('../core/menu/atticRadarMenu');

const STORAGE_KEY = 'attic_admin_weather_warning';
const DEFAULT_PASSCODE = '1172';
const ADMIN_WARNING_API = 'admin_warning.php';

function _read_warning_from_storage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return null;
        }
        return JSON.parse(raw);
    } catch (err) {
        console.log('Failed to parse admin warning from storage.', err);
        return null;
    }
}

function _save_warning_to_storage(warning_data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(warning_data));
}

function _clear_warning_from_storage() {
    localStorage.removeItem(STORAGE_KEY);
}

function _fetch_warning_from_server() {
    return $.ajax({
        url: ADMIN_WARNING_API,
        method: 'GET',
        dataType: 'json',
    }).then((response) => {
        if (response && response.warning) {
            return response.warning;
        }
        return null;
    }).catch(() => null);
}

function _save_warning_to_server(warning_data) {
    return $.ajax({
        url: ADMIN_WARNING_API,
        method: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({
            passcode: $('#adminWarningPasscode').val(),
            action: 'issue',
            warning: warning_data,
        }),
    });
}

function _clear_warning_on_server() {
    return $.ajax({
        url: ADMIN_WARNING_API,
        method: 'POST',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({
            passcode: $('#adminWarningPasscode').val(),
            action: 'clear',
        }),
    });
}

function _is_expired(warning_data) {
    if (!warning_data || !warning_data.expires_at) {
        return true;
    }
    const expires_timestamp = Date.parse(warning_data.expires_at);
    return Number.isNaN(expires_timestamp) || expires_timestamp <= Date.now();
}

function _hide_banner() {
    $('#adminWeatherWarningBanner').hide();
}

function _severity_to_color(severity) {
    const colors = {
        Advisory: 'rgba(40, 114, 255, 0.92)',
        Watch: 'rgba(176, 130, 25, 0.95)',
        Warning: 'rgba(205, 92, 0, 0.95)',
        Emergency: 'rgba(188, 33, 33, 0.95)',
    };
    if (colors[severity] !== undefined) {
        return colors[severity];
    }
    return 'rgba(30, 30, 30, 0.92)';
}

function _render_banner(warning_data) {
    if (!warning_data || _is_expired(warning_data)) {
        _hide_banner();
        _clear_warning_from_storage();
        return;
    }

    const expires_date = new Date(warning_data.expires_at);
    const expires_text = Number.isNaN(expires_date.getTime()) ? 'Unknown expiration' : expires_date.toUTCString();
    const title = warning_data.title || 'Weather Warning';
    const message = warning_data.message || '';
    const severity = warning_data.severity || 'Warning';

    $('#adminWeatherWarningBannerText').html(
        `<b>${severity}:</b> ${title}<br><span style="font-size: 12px; opacity: 0.92">${message}<br>Expires: ${expires_text}</span>`,
    );
    $('#adminWeatherWarningBanner').css('background', _severity_to_color(severity));
    $('#adminWeatherWarningBanner').css('display', 'flex');
}

function _handle_issue_warning() {
    const passcode = $('#adminWarningPasscode').val();
    const configured_passcode = window.atticData?.admin_warning_passcode || DEFAULT_PASSCODE;

    if (passcode !== configured_passcode) {
        alert('Invalid admin passcode.');
        return;
    }

    const title = $('#adminWarningTitle').val()?.trim();
    const message = $('#adminWarningMessage').val()?.trim();
    const severity = $('#adminWarningSeverity').val() || 'Warning';
    const expires_hours = parseInt($('#adminWarningExpiresHours').val(), 10);

    if (!title || !message) {
        alert('Title and message are required.');
        return;
    }

    const valid_expiration = Number.isInteger(expires_hours) && expires_hours > 0 ? expires_hours : 6;
    const expires_at = new Date(Date.now() + valid_expiration * 60 * 60 * 1000).toISOString();

    const warning_data = {
        title,
        message,
        severity,
        expires_at,
        issued_at: new Date().toISOString(),
    };

    _save_warning_to_server(warning_data)
        .done(() => {
            _save_warning_to_storage(warning_data);
            _render_banner(warning_data);
        })
        .fail((xhr, textStatus, errorThrown) => {
            const errorMessage = xhr?.responseJSON?.message || errorThrown || textStatus || 'Failed to save warning on server.';
            alert(errorMessage);
        });
}

function _handle_clear_warning() {
    const passcode = $('#adminWarningPasscode').val();
    const configured_passcode = window.atticData?.admin_warning_passcode || DEFAULT_PASSCODE;

    if (passcode !== configured_passcode) {
        alert('Invalid admin passcode.');
        return;
    }

    _clear_warning_on_server()
        .done(() => {
            _clear_warning_from_storage();
            _hide_banner();
        })
        .fail((xhr, textStatus, errorThrown) => {
            const errorMessage = xhr?.responseJSON?.message || errorThrown || textStatus || 'Failed to clear warning on server.';
            alert(errorMessage);
        });
}

function _open_admin_warning_menu() {
    armFunctions.showARMwindow();
    $('#atticRadarMenuMainScreen').hide();
    $('#atticRadarMenuSPCScreen').hide();
    $('#atticRadarMenuSettingsScreen').show();
    setTimeout(() => {
        const section = $('#adminWarningSection');
        if (section.length) {
            $('#atticRadarMenuSettingsScreen').animate({ scrollTop: Math.max(section.position().top - 10, 0) }, 300);
        }
    }, 300);
}

function init_admin_warning_system() {
    _fetch_warning_from_server().then((serverWarning) => {
        if (serverWarning) {
            _save_warning_to_storage(serverWarning);
            _render_banner(serverWarning);
        } else {
            const current = _read_warning_from_storage();
            _render_banner(current);
        }
    });

    $('#adminWarningIssueBtn').on('click', _handle_issue_warning);
    $('#adminWarningClearBtn').on('click', _handle_clear_warning);
    $('#adminWeatherWarningBannerClose').on('click', _hide_banner);
    $('#adminMenuItemDiv').on('click', _open_admin_warning_menu);
}

module.exports = init_admin_warning_system;
