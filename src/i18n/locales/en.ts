/**
 * English messages – the source of truth for translation keys (types are
 * derived from this object). Plurals use i18next suffixes: `_one`, `_other`.
 */
export const en = {
  common: {
    appName: 'Personal Trainer',
    open: 'Open',
    back: 'Back',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving…',
    delete: 'Delete',
    optional: 'optional',
    sortBy: 'Sort by {{column}}',
  },
  nav: {
    home: 'Home',
    dashboard: 'Dashboard',
    label: 'Main navigation',
    open: 'Open menu',
    trainings: 'Trainings',
    users: 'App users',
    clients: 'Clients',
    billing: 'Billing',
    calendar: 'Calendar',
  },
  language: {
    label: 'Language',
    pl: 'Polski',
    en: 'English',
  },
  theme: {
    toggle: 'Toggle theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
  },
  errorPage: {
    title: 'Something went wrong',
    tryAgain: 'Try again',
  },
  notFound: {
    message: 'The page you are looking for does not exist.',
    goHome: 'Go home',
  },
  validation: {
    nameRequired: 'Name is required',
    emailRequired: 'Email is required',
    invalidEmail: 'Invalid email',
    invalidPhone: 'Invalid phone number',
    dateFormat: 'Use the YYYY-MM-DD format',
    invalidDate: 'Invalid date',
    familyGroupRequired: 'Choose a family group',
  },
  auth: {
    title: 'Sign in',
    description: 'Sign in to manage trainings, clients and billing.',
    google: 'Continue with Google',
    or: 'or',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    submit: 'Sign in',
    resetSent:
      'If an account exists for {{email}}, we’ve sent a link to set a new password.',
    notConfigured: {
      title: 'Firebase is not configured',
      description:
        'Add the Firebase web app settings to .env.local and restart the dev server. Missing:',
    },
    menu: {
      label: 'Account',
      signOut: 'Sign out',
    },
    errors: {
      generic: 'Something went wrong – please try again.',
      invalidCredential: 'Wrong email or password.',
      userNotFound: 'No account with this email.',
      invalidEmail: 'Enter a valid email address.',
      missingPassword: 'Enter your password.',
      userDisabled: 'This account has been disabled.',
      tooManyRequests:
        'Too many attempts. Wait a moment or reset your password.',
      network: 'No connection to Firebase – check your internet connection.',
      popupBlocked:
        'The browser blocked the Google popup – allow popups for this site.',
      unauthorizedDomain:
        'This domain is not authorised in Firebase (Authentication → Settings → Authorised domains).',
      providerDisabled: 'This sign-in method is not enabled in Firebase.',
      misconfigured:
        'Firebase configuration is invalid – check the VITE_FIREBASE_* values.',
      emailForReset:
        'Enter your email address first, then click “Forgot password?”.',
    },
  },
  errors: {
    unauthorized: 'Your session has expired – sign in again.',
    invalidToken: 'Sign-in failed – please try again.',
    recentSignInRequired: 'Sign-in took too long – please try again.',
    emailRequired: 'This account has no email address.',
    emailNotVerified:
      'This email address is not verified yet. Use “Forgot password?” – the link we send confirms the address.',
    accessDenied:
      '{{email}} has no access to this app. Ask the administrator to add it.',
    authNotConfigured:
      'Sign-in is not configured on the server (Firebase Admin credentials are missing).',
    userNotFound: 'User #{{id}} not found',
    emailInUse: 'Email {{email}} is already in use',
    phoneInUse: 'Phone {{phone}} is already in use',
    trainingNotFound: 'Training #{{id}} not found',
    familyGroupNotFound: 'Family group #{{id}} not found',
    planNotFound: 'Plan #{{id}} not found',
    packageNotFound: 'Package #{{id}} not found',
    periodNotFound: 'Billing period not found',
    planStartRequired: 'Choose the date the new plan starts',
    planMustStartAfter:
      'The new plan must start after the current one ({{date}})',
    alreadyOnPlan: '{{name}} is already on this plan',
    familyBilledPerPackage: 'Family plans are billed per package',
    periodNotFinished: 'The period is not finished yet',
    firstPlanCoversHistory: 'The first plan already covers all past trainings',
    mustStartAfterPrevious:
      'Must be after the start of the previous plan ({{date}})',
    onlyCurrentPlan: 'Only the current plan can be corrected',
    smsAlreadySent:
      'A reminder SMS was already sent for this plan – change the plan instead',
    cannotRevokeOwnAccess: 'You can’t revoke your own access',
    emailUsedBy: '{{email}} already belongs to {{name}}',
    paymentAlreadyRecorded:
      'Payments are already recorded for this plan – change the plan instead',
    noCalendarFiles: 'Choose at least one .ics file',
    tooManyCalendarFiles: 'Upload at most {{max}} files at once',
    invalidCalendarFile: '{{file}} is not a valid iCalendar (.ics) file',
    calendarFileTooLarge: '{{file}} is larger than {{maxMb}} MB',
    invalidCalendarId: 'Enter a valid calendar ID for {{file}}',
    duplicateCalendarId: 'Calendar ID {{calendarId}} is used more than once',
  },
  users: {
    title: 'Users',
    description: 'Trainers and clients. Email and phone are optional.',
    empty: 'No users yet. Add one or import trainings.',
    noResults: 'No users match the filters.',
    isTrainerAria: '{{name}} is a trainer',
    fields: {
      name: 'Name',
      email: 'Email',
      phone: 'Phone',
      isTrainer: 'Trainer',
      trainings: 'Trainings',
      lastTraining: 'Last training',
    },
    filters: {
      search: 'Search name, email or phone…',
      role: 'Role',
      roles: {
        all: 'Everyone',
        trainers: 'Trainers',
        others: 'Others',
      },
      noPhone: 'Without phone',
      clear: 'Clear filters',
    },
    form: {
      add: 'Add',
    },
    app: {
      title: 'App users',
      description:
        'People who can sign in to the app. Add someone here or give a client access from Clients.',
      add: 'Add user',
      addTitle: 'New app user',
      addDescription:
        'They can sign in right away with Google or with email and password (“Forgot password?” on the login page sets it).',
      loginEmail: 'Sign-in email',
      loginEmailHint: 'They sign in with this address.',
      access: 'Access',
      canSignIn: 'Can sign in',
      noAccess: 'No access',
      empty: 'No app users yet.',
    },
    clients: {
      title: 'Clients',
      description:
        'People you train. They have no account – give one access if they should sign in.',
      add: 'Add client',
      addTitle: 'New client',
      addDescription:
        'Only the name is required. Email and phone are optional but must be unique.',
      empty: 'No clients yet. Add one or import trainings.',
    },
    grant: {
      action: 'Give access',
      title: 'Give access to the app',
      description:
        '<strong>{{name}}</strong> will be able to sign in and moves to App users.',
      noRoles:
        'There are no roles yet – everyone with access sees all trainings, clients and billing.',
      submit: 'Give access',
    },
    revoke: {
      action: 'Revoke access',
      title: 'Revoke access?',
      description:
        '<strong>{{name}}</strong> will be signed out and can’t sign in anymore. Their trainings and billing stay.',
      confirm: 'Revoke access',
    },
    toast: {
      created: 'Created {{name}}',
      appUserCreated: '{{name}} can now sign in',
      accessGranted: '{{name}} can now sign in',
      accessRevoked: '{{name}} can no longer sign in',
    },
  },
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Overview for {{date}}',
    kpis: 'Key figures',
    stats: {
      week: 'Trainings this week',
      month: 'Trainings this month',
      activeClients: 'Active clients',
      cancellations: 'Cancellation rate',
      planned_one: '{{count}} more planned',
      planned_other: '{{count}} more planned',
      last30Days: 'Last 30 days',
    },
    delta: {
      week: '{{value}} vs last week so far',
      month: '{{value}} vs same days last month',
      rolling: '{{value}} vs previous 30 days',
      rollingPoints: '{{value}} pp vs previous 30 days',
    },
    weekly: {
      title: 'Trainings per week',
      description:
        'Completed trainings over the last 12 weeks. Click a bar to see that week.',
      trainings_one: '{{count}} training',
      trainings_other: '{{count}} trainings',
      barLabel_one: '{{range}}: {{count}} training',
      barLabel_other: '{{range}}: {{count}} trainings',
      inProgress: 'in progress',
      showTable: 'Show as table',
      week: 'Week',
      count: 'Trainings',
    },
    todo: {
      title: 'To do',
      allDone: 'Nothing waiting – all done.',
      unassigned_one: '{{count}} training without a client',
      unassigned_other: '{{count}} trainings without a client',
      smsDue_one: '{{count}} payment reminder SMS to send',
      smsDue_other: '{{count}} payment reminder SMS to send',
      withoutPlan_one: '{{count}} client without a billing plan',
      withoutPlan_other: '{{count}} clients without a billing plan',
      assign: 'Assign',
      openBilling: 'Billing',
    },
    today: {
      title: 'Today',
      description_one: '{{count}} training',
      description_other: '{{count}} trainings',
      empty: 'No trainings today.',
      open: 'Open in trainings',
    },
    topClients: {
      title: 'Most active clients',
      empty: 'No trainings in the last 30 days.',
      row_one: '{{name}}: {{count}} training',
      row_other: '{{name}}: {{count}} trainings',
    },
  },
  pagination: {
    range: '{{from}}–{{to}} of {{total}}',
    perPage: 'Per page',
    page: 'Page {{page}} of {{pages}}',
    first: 'First page',
    previous: 'Previous page',
    next: 'Next page',
    last: 'Last page',
  },
  trainings: {
    title: 'Trainings',
    description: 'Imported from trainer calendars (up to one month ahead).',
    unassignedCount_one:
      '{{count}} training without a client – assign it manually.',
    unassignedCount_other:
      '{{count}} trainings without a client – assign them manually.',
    empty:
      'No trainings. Click “Pull from calendars” or upload an .ics file to import them.',
    noResults: 'No trainings match the filters.',
    showUnassigned: 'Show them',
    filters: {
      search: 'Search client, title or notes…',
      trainer: 'Trainer',
      allTrainers: 'All trainers',
      status: 'Status',
      statuses: {
        active: 'Scheduled',
        confirmed: 'Confirmed',
        cancelled: 'Cancelled',
        removed: 'Removed from calendar',
        ignored: 'Ignored',
        all: 'All',
      },
      from: 'From',
      to: 'To',
      onlyUnassigned: 'Only unassigned',
      clear: 'Clear filters',
    },
    table: {
      date: 'Date',
      time: 'Time',
      trainer: 'Trainer',
      client: 'Client',
      status: 'Status',
      notes: 'Notes',
      actions: 'Actions',
      hasNotes: 'Has notes',
      showNotes: 'Show details and notes',
      assign: '{{name}} – assign',
      calendarTitle: 'Calendar title: {{title}}',
      clickToChange: 'Calendar title: {{title}}. Click to change.',
    },
    calendar: {
      title: 'Training calendar',
      description:
        'All trainings by day. Colors mark trainers; a dashed outline means no client is assigned.',
      open: 'Calendar',
      list: 'List',
      previous: 'Previous',
      next: 'Next',
      today: 'Today',
      loading: 'Loading…',
      showHidden: 'Show removed and ignored',
      views: {
        dayGridMonth: 'Month',
        timeGridWeek: 'Week',
        timeGridDay: 'Day',
        listWeek: 'Agenda',
      },
    },
    status: {
      confirmed: 'Confirmed',
      cancelled: 'Cancelled',
      removed: 'Removed',
      removedHint: 'No longer in the calendar (deleted or moved)',
      ignored: 'Ignored',
      ignoredHint: 'Marked as not a training',
    },
    details: {
      show: 'Show details',
      location: 'Location',
      noNotes: 'No notes in the calendar entry.',
      noClient: 'Not assigned (calendar: {{name}})',
      changeClient: 'Change client',
    },
    ignore: {
      action: 'Not a training – ignore',
      title: 'Ignore this event?',
      description:
        '<strong>“{{title}}”</strong> ({{date}}) will be hidden from the list and won’t count towards billing.',
      applyToSameTitle:
        'Also ignore other “{{title}}” events and skip this title in future imports',
      submit: 'Ignore',
      pending: 'Ignoring…',
      toast_one: 'Event ignored',
      toast_other: '{{count}} events ignored',
    },
    restore: {
      action: 'Restore as a training',
      toast_one: 'Event restored',
      toast_other: '{{count}} events restored',
    },
    upload: {
      button: 'Upload .ics',
      title: 'Upload calendar files',
      description:
        'Import trainings from iCalendar (.ics) exports, e.g. Google Calendar → Settings → Import & export.',
      chooseFiles: 'Calendar files',
      calendarId: 'Calendar ID',
      calendarIdHint:
        'The trainer’s email for a personal calendar. Keep it the same on every upload, otherwise trainings get duplicated.',
      remove: 'Remove {{file}}',
      submit: 'Import',
      pending: 'Importing…',
    },
    import: {
      button: 'Pull from calendars',
      pending: 'Pulling…',
      toast: {
        title_one:
          'Imported {{count}} calendar: {{created}} new, {{updated}} updated',
        title_other:
          'Imported {{count}} calendars: {{created}} new, {{updated}} updated',
        cancelled_one: '{{count}} cancelled',
        cancelled_other: '{{count}} cancelled',
        ignored_one: '{{count}} ignored',
        ignored_other: '{{count}} ignored',
        removed_one: '{{count}} removed from calendar',
        removed_other: '{{count}} removed from calendar',
        skipped_one: '{{count}} non-training event skipped',
        skipped_other: '{{count}} non-training events skipped',
        peopleCreated:
          'trainers created: {{trainers}}, clients created: {{clients}}',
        unassigned_one: '{{count}} needs a client assigned',
        unassigned_other: '{{count}} need a client assigned',
      },
    },
    assign: {
      title: 'Assign client',
      description:
        'Calendar entry <strong>“{{title}}”</strong> ({{trainer}}, {{date}}).',
      existingClient: 'Existing client',
      chooseUser: 'Choose a user…',
      suggested: 'Suggested',
      allUsers: 'All users',
      trainer: 'trainer',
      applyToSameName:
        'Also assign other unassigned “{{name}}” trainings and remember this name for future imports',
      submit: 'Assign',
      assigning: 'Assigning…',
      orCreate: '…or create a new client',
      createAndAssign: 'Create & assign',
      toast_one: 'Client assigned',
      toast_other: 'Client assigned to {{count}} trainings',
    },
  },
  billing: {
    title: 'Billing',
    description:
      'Billing plans of clients. Tick the checkbox once the payment reminder SMS has been sent for a finished period.',
    wholeHistory: 'Whole history',
    plans: {
      trainings_4: 'Every 4 trainings',
      trainings_8: 'Every 8 trainings',
      trainings_12: 'Every 12 trainings',
      monthly: 'Monthly',
      family: 'Family package',
    },
    tabs: {
      custom: 'Custom',
      comingSoon: 'Coming soon',
      withoutPlan: 'Without plan',
    },
    actions: {
      changePlan: 'Change plan',
      history: 'History',
      assignPlan: 'Assign plan',
    },
    individual: {
      client: 'Client',
      since: 'Since',
      periods: 'Periods (✓ = reminder SMS sent)',
      empty: 'Nobody is on this plan. Assign plans in the “Without plan” tab.',
    },
    periods: {
      empty: 'No attended trainings yet',
      emptySince: 'No attended trainings since {{date}}',
      inProgress: 'in progress',
      trainings_one: '{{count}} training',
      trainings_other: '{{count}} trainings',
      showAll_one: 'Show all {{count}} periods',
      showAll_other: 'Show all {{count}} periods',
      showLess: 'Show less',
      period: 'Period',
      trainingsHeader: 'Trainings',
      sms: 'SMS',
    },
    payment: {
      label: 'Paid',
      placeholder: 'e.g. transfer 12.11',
      aria: 'Paid – {{period}}',
    },
    sms: {
      sentAria: 'Reminder SMS sent',
      sentOn: 'SMS {{date}}',
      due: 'SMS due',
      dueCount_one: '{{count}} SMS due',
      dueCount_other: '{{count}} SMS due',
    },
    unmarkSms: {
      title: 'Unmark the reminder SMS?',
      period:
        'The period {{period}} will go back to “SMS due”. Its dates will be recalculated from the current trainings, so they may shift if something changed in the calendar in the meantime.',
      month: '{{period}} will go back to “SMS due”.',
      package_one:
        'The package of {{count}} training (from {{date}}) will go back to “SMS due”.',
      package_other:
        'The package of {{count}} trainings (from {{date}}) will go back to “SMS due”.',
      appOnly:
        'This only changes the mark in the app – it doesn’t affect a message the client has already received.',
      keep: 'Keep it marked',
      confirm: 'Unmark',
    },
    withoutPlan: {
      empty: 'Every client has a billing plan.',
      firstTraining: 'First training',
    },
    assign: {
      assignTitle: 'Assign plan – {{name}}',
      changeTitle: 'Change plan – {{name}}',
      currently:
        'Currently: {{plan}}{{group}} since {{since}}. The current plan ends the day before the new one starts; its history is kept.',
      firstPlan:
        'This is the first plan, so it covers all of the client’s trainings – past ones included.',
      plan: 'Plan',
      familyGroup: 'Family group',
      newGroup: '+ New group…',
      newGroupName: 'New group name',
      newGroupPlaceholder: 'e.g. Kowalscy',
      from: 'From',
      tooEarly: 'Must be after {{date}} (start of the current plan).',
      startsWithFirstTraining: 'Billing starts with the first training.',
      startsWithFirstTrainingOn:
        'Billing starts with the first training ({{date}}).',
    },
    correct: {
      title: 'Fix a mistake in the current plan',
      description:
        'Corrects the plan in place (no history entry). Only possible until a reminder SMS has been sent for it.',
      startDate: 'Start date',
      saveStartDate: 'Save start date',
      remove: 'Remove plan',
    },
    history: {
      title: 'Billing history – {{name}}',
      description:
        'Plans are never overwritten: each change starts a new entry.',
      empty: 'No plans yet.',
      now: 'now',
      current: 'Current',
      familyHint: 'Billed per family package – see the Family package tab.',
    },
    family: {
      empty:
        'No family groups. Assign the “Family package” plan to a client to create one.',
      memberSince: '{{name}} (since {{date}})',
      noMembers: 'No current members',
      addPackage: 'Add package',
      uncovered_one:
        '{{count}} training not covered by any package – add a new package.',
      uncovered_other:
        '{{count}} trainings not covered by any package – add a new package.',
      noPackages: 'No packages yet.',
      packageFrom: 'from {{date}}',
      usedBetween: 'used {{from}} – {{to}}',
      usedUp: 'Used up – SMS due',
      left_one: '{{count}} left',
      left_other: '{{count}} left',
      newPackageTitle: 'New package – {{name}}',
      newPackageDescription:
        'Members’ trainings from the start date use up the package after the previous ones are used up.',
      size: 'Trainings',
      notes: 'Notes',
    },
    toast: {
      planAssigned: 'Plan assigned',
      paymentSaved: 'Payment note saved',
      startCorrected: 'Start date corrected',
      planRemoved: 'Plan removed',
      groupCreated: 'Family group created',
      packageAdded: 'Package added',
    },
  },
} as const

export type ErrorKey = keyof typeof en.errors
