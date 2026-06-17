/**
 * Canonical "Channel of Reporting" values — the medium through which an alert
 * reached the system (distinct from the Source of Alert, which is who/where the
 * signal came from). Used in the add-alert form and any channel dropdown.
 */
export const CHANNEL_OF_REPORTING_OPTIONS = [
	"SMS (6767)",
	"Call Centre",
	"alerts.health.go.ug",
	"Social media",
	"eCHIS",
	"Direct Call",
	"912",
] as const;

export type ChannelOfReporting = (typeof CHANNEL_OF_REPORTING_OPTIONS)[number];
