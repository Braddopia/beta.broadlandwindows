/* main: the entry point. Loads every module, registers the actions buttons can run,
   then runs the start-up steps in a fixed order (load data, update old data, wire the page, first draw). */
import * as uiComponentsPickers from './ui/components/pickers.js';
import * as dataCompany from './data/company.js';
import * as configConstants from './config/constants.js';
import * as configRoles from './config/roles.js';
import * as coreActions from './core/actions.js';
import * as coreAssets from './core/assets.js';
import * as coreCrypto from './core/crypto.js';
import * as coreDates from './core/dates.js';
import * as coreDom from './core/dom.js';
import * as uiDownload from './ui/download.js';
import * as coreFormat from './core/format.js';
import * as coreEvents from './core/events.js';
import * as coreHaptics from './core/haptics.js';
import * as coreHttps from './core/https.js';
import * as coreIcons from './core/icons.js';
import * as coreXlsx from './core/xlsx.js';
import * as coreIds from './core/ids.js';
import * as dataSanitize from './data/sanitize.js';
import * as dataAudit from './data/audit.js';
import * as featuresAdminBackup from './features/admin/backup.js';
import * as featuresRecordsDelete from './features/records/delete.js';
import * as startMigrations from './start/migrations.js';
import * as dataPersistence from './data/persistence.js';
import * as dataPhotos from './data/photos.js';
import * as configColours from './config/colours.js';
import * as dataSeed from './data/seed.js';
import * as dataLoad from './data/load.js';
import * as dataRepository from './data/repository.js';
import * as dataSession from './data/session.js';
import * as dataSync from './data/sync.js';
import * as dataSourcesDataSource from './data/sources/data-source.js';
import * as dataState from './data/state.js';
import * as domainChecklists from './domain/checklists.js';
import * as domainCustomers from './domain/customers.js';
import * as domainDeliveries from './domain/deliveries.js';
import * as domainHolidays from './domain/holidays.js';
import * as domainLeads from './domain/leads.js';
import * as domainNumbering from './domain/numbering.js';
import * as domainPermissions from './domain/permissions.js';
import * as domainPeople from './domain/people.js';
import * as domainService from './domain/service.js';
import * as domainStockTake from './domain/stock-take.js';
import * as domainStock from './domain/stock.js';
import * as featuresAdminAdmin from './features/admin/admin.js';
import * as featuresAuthPins from './features/auth/pins.js';
import * as featuresAuthSession from './features/auth/session.js';
import * as featuresCalendarCalendar from './features/calendar/calendar.js';
import * as featuresContactsContacts from './features/contacts/contacts.js';
import * as featuresContractsContractRecord from './features/contracts/contract-record.js';
import * as featuresContractsContracts from './features/contracts/contracts.js';
import * as featuresContractsDocuments from './features/contracts/documents.js';
import * as featuresContractsFinanceStep from './features/contracts/finance-step.js';
import * as featuresDeliveriesDeliveries from './features/deliveries/deliveries.js';
import * as featuresDocumentsDocuments from './features/documents/documents.js';
import * as featuresFilesFiles from './features/files/files.js';
import * as featuresFinanceFinance from './features/finance/finance.js';
import * as featuresHolidaysHolidays from './features/holidays/holidays.js';
import * as featuresHomeHome from './features/home/home.js';
import * as featuresHomeReviews from './features/home/reviews.js';
import * as featuresLeadsLeadRecord from './features/leads/lead-record.js';
import * as featuresLeadsLeads from './features/leads/leads.js';
import * as featuresLiveBoardsLiveBoards from './features/live-boards/live-boards.js';
import * as featuresMessagesMessages from './features/messages/messages.js';
import * as featuresNotificationsNotifications from './features/notifications/notifications.js';
import * as featuresProblemsProblems from './features/problems/problems.js';
import * as featuresProfileProfile from './features/profile/profile.js';
import * as featuresRecordsAppointments from './features/records/appointments.js';
import * as featuresRecordsCards from './features/records/cards.js';
import * as featuresRecordsChecklist from './features/records/checklist.js';
import * as featuresRecordsFields from './features/records/fields.js';
import * as featuresRecordsListParts from './features/records/list-parts.js';
import * as featuresRecordsNotes from './features/records/notes.js';
import * as featuresRecordsPhotosDocs from './features/records/photos-docs.js';
import * as featuresRecordsProducts from './features/records/products.js';
import * as featuresRecordsRecordWindow from './features/records/record-window.js';
import * as featuresRecordsPreviewNotice from './features/records/preview-notice.js';
import * as featuresCuttingCutting from './features/cutting/cutting.js';
import * as featuresRecordsStages from './features/records/stages.js';
import * as featuresRecordsSurvey from './features/records/survey.js';
import * as featuresReportsMore from './features/reports/more.js';
import * as featuresReportsReports from './features/reports/reports.js';
import * as featuresScannerScanner from './features/scanner/scanner.js';
import * as featuresSearchAnswers from './features/search/answers.js';
import * as featuresSearchCommands from './features/search/commands.js';
import * as featuresSearchQuestions from './features/search/questions.js';
import * as featuresSearchSearch from './features/search/search.js';
import * as featuresServiceService from './features/service/service.js';
import * as featuresSettingsSettings from './features/settings/settings.js';
import * as featuresSettingsDocBuilder from './features/settings/doc-builder.js';
import * as featuresBarsBars from './features/bars/bars.js';
import * as featuresTagsTags from './features/tags/tags.js';
import * as featuresScheduleSchedule from './features/schedule/schedule.js';
import * as featuresSignInSignIn from './features/sign-in/sign-in.js';
import * as featuresStaffStaff from './features/staff/staff.js';
import * as featuresStockItemWindow from './features/stock/item-window.js';
import * as featuresStockPhoneMode from './features/stock/phone-mode.js';
import * as featuresStockReports from './features/stock/reports.js';
import * as featuresStockStockTake from './features/stock/stock-take.js';
import * as featuresStockStock from './features/stock/stock.js';
import * as featuresSuppliersSuppliers from './features/suppliers/suppliers.js';
import * as featuresTourTour from './features/tour/tour.js';
import * as integrationsHallmark from './integrations/hallmark.js';
import * as integrationsSmartOrders from './integrations/smart-orders.js';
import * as startBoot from './start/boot.js';
import * as printPrint from './print/print.js';
import * as uiComponentsArt from './ui/components/art.js';
import * as uiComponentsKpi from './ui/components/kpi.js';
import * as uiComponentsPopover from './ui/components/popover.js';
import * as uiComponentsTable from './ui/components/table.js';
import * as uiComponentsTags from './ui/components/tags.js';
import * as uiFormsColourPicker from './ui/forms/colour-picker.js';
import * as uiFormsForm from './ui/forms/form.js';
import * as uiFormsPhotos from './ui/forms/photos.js';
import * as uiFormsWizard from './ui/forms/wizard.js';
import * as uiModal from './ui/modal.js';
import * as uiMorph from './ui/morph.js';
import * as uiShellDataEvents from './ui/shell/data-events.js';
import * as uiShellLooks from './ui/shell/looks.js';
import * as uiShellRouter from './ui/shell/router.js';
import * as uiShellShell from './ui/shell/shell.js';
import * as uiShellTheme from './ui/shell/theme.js';
import * as uiToast from './ui/toast.js';
import * as uiUiState from './ui/ui-state.js';
import { ACTIONS } from './core/actions.js';

const modules = {
  dataCompany,
  configColours,
  configConstants,
  configRoles,
  coreActions,
  coreAssets,
  coreCrypto,
  coreDates,
  coreDom,
  uiDownload,
  coreFormat,
  coreEvents,
  coreHaptics,
  coreHttps,
  coreIcons,
  coreIds,
  coreXlsx,
  dataSanitize,
  dataAudit,
  featuresAdminBackup,
  featuresRecordsDelete,
  startMigrations,
  dataPersistence,
  dataPhotos,
  dataLoad,
  dataSeed,
  dataRepository,
  dataSession,
  dataSync,
  dataSourcesDataSource,
  dataState,
  domainChecklists,
  domainCustomers,
  domainDeliveries,
  domainHolidays,
  domainLeads,
  domainNumbering,
  domainPeople,
  domainPermissions,
  domainService,
  domainStock,
  domainStockTake,
  featuresAdminAdmin,
  featuresAuthPins,
  featuresAuthSession,
  featuresCalendarCalendar,
  featuresContactsContacts,
  featuresContractsContractRecord,
  featuresContractsContracts,
  featuresContractsDocuments,
  featuresContractsFinanceStep,
  featuresDeliveriesDeliveries,
  featuresDocumentsDocuments,
  featuresFilesFiles,
  featuresFinanceFinance,
  featuresHolidaysHolidays,
  featuresHomeHome,
  featuresHomeReviews,
  featuresLeadsLeadRecord,
  featuresLeadsLeads,
  featuresLiveBoardsLiveBoards,
  featuresMessagesMessages,
  featuresNotificationsNotifications,
  featuresProblemsProblems,
  featuresProfileProfile,
  featuresRecordsAppointments,
  featuresRecordsCards,
  featuresRecordsChecklist,
  featuresRecordsFields,
  featuresRecordsListParts,
  featuresRecordsNotes,
  featuresRecordsPhotosDocs,
  featuresRecordsProducts,
  featuresRecordsRecordWindow,
  featuresRecordsPreviewNotice,
  featuresCuttingCutting,
  featuresRecordsStages,
  featuresRecordsSurvey,
  featuresReportsMore,
  featuresReportsReports,
  featuresScannerScanner,
  featuresSearchAnswers,
  featuresSearchCommands,
  featuresSearchQuestions,
  featuresSearchSearch,
  featuresServiceService,
  featuresSettingsSettings,
  featuresSettingsDocBuilder,
  featuresBarsBars,
  featuresTagsTags,
  featuresScheduleSchedule,
  featuresSignInSignIn,
  featuresStaffStaff,
  featuresStockItemWindow,
  featuresStockPhoneMode,
  featuresStockReports,
  featuresStockStock,
  featuresStockStockTake,
  featuresSuppliersSuppliers,
  featuresTourTour,
  integrationsHallmark,
  integrationsSmartOrders,
  startBoot,
  printPrint,
  uiComponentsArt,
  uiComponentsKpi,
  uiComponentsPopover,
  uiComponentsTable,
  uiComponentsTags,
  uiFormsColourPicker,
  uiFormsForm,
  uiFormsPhotos,
  uiFormsWizard,
  uiModal,
  uiMorph,
  uiShellDataEvents,
  uiShellLooks,
  uiShellRouter,
  uiShellShell,
  uiShellTheme,
  uiToast,
  uiUiState,
};

/* every exported function can be named by a button (data-act="name") */
for (const mod of Object.values(modules))
  for (const [name, value] of Object.entries(mod))
    if (typeof value === 'function' && !ACTIONS[name]) ACTIONS[name] = value;

/* window.CRM: one read-only handle on the app for debugging and the browser tests (live values) */
const CRM = {};
for (const mod of Object.values(modules))
  for (const name of Object.keys(mod)) Object.defineProperty(CRM, name, { get: () => mod[name], enumerable: true });
window.CRM = Object.freeze(CRM);

/* start-up, in order */
coreHttps.forceHttps();
coreActions.listenForActions();
uiShellDataEvents.connectDataToScreen();
dataLoad.load();
startMigrations.migrate();
dataLoad.defineCurrentUser();
dataPersistence.askBrowserToKeepData();
dataSync.listenForOtherTabs();
featuresAuthSession.restoreRole();
featuresAuthSession.watchForIdle();
uiFormsForm.listenForFormChanges();
featuresRecordsRecordWindow.plugRecordWindowIn();
featuresScannerScanner.plugScannerIn();
featuresSuppliersSuppliers.plugSuppliersIn();
uiModal.listenForBackdropClicks();
uiComponentsPopover.listenForOutsideClicks();
uiShellShell.shell();
featuresLiveBoardsLiveBoards.listenForTvKeys();
featuresLiveBoardsLiveBoards.startBoardTimers();
startMigrations.supCon();
startMigrations.staffCats();
startMigrations.salesABC();
startMigrations.migrateLeads();
startMigrations.ckReword();
startMigrations.ckReword3();
startMigrations.holV2();
featuresHolidaysHolidays.listenForHolidayChart();
startMigrations.migratePhotos();
featuresStockPhoneMode.watchPhoneSize();
startMigrations.migrateCustomers();
featuresLeadsLeadRecord.defineLeadRecord();
featuresContractsContractRecord.defineContractRecord();
featuresTourTour.listenForTourKeys();
uiComponentsPickers.listenForPickers();
featuresContractsContracts.plugJobPickers();
featuresBarsBars.plugProfilePicker();
featuresSignInSignIn.resetSignIn();
featuresSignInSignIn.watchSignInExpiry();
uiShellLooks.looks();
featuresSearchSearch.search();
featuresSettingsSettings.restoreMotionSetting();
startBoot.boot();
coreHaptics.listenForTaps();
