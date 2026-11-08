/**
 * Polish messages – must have the same keys as `en.ts` (checked by
 * `locales.test.ts`). Plurals: `_one` (1), `_few` (2–4, 22–24…),
 * `_many` (0, 5–21…), `_other` (fractions).
 */
export const pl = {
  common: {
    appName: 'Trener Personalny',
    open: 'Otwórz',
    back: 'Wstecz',
    cancel: 'Anuluj',
    save: 'Zapisz',
    saving: 'Zapisywanie…',
    delete: 'Usuń',
    sortBy: 'Sortuj: {{column}}',
    optional: 'opcjonalnie',
  },
  nav: {
    home: 'Start',
    dashboard: 'Pulpit',
    label: 'Nawigacja główna',
    open: 'Otwórz menu',
    trainings: 'Treningi',
    users: 'Użytkownicy',
    clients: 'Podopieczni',
    billing: 'Rozliczenia',
    calendar: 'Kalendarz',
  },
  language: {
    label: 'Język',
    pl: 'Polski',
    en: 'English',
  },
  theme: {
    toggle: 'Zmień motyw',
    light: 'Jasny',
    dark: 'Ciemny',
    system: 'Systemowy',
  },
  errorPage: {
    title: 'Coś poszło nie tak',
    tryAgain: 'Spróbuj ponownie',
  },
  notFound: {
    message: 'Strona, której szukasz, nie istnieje.',
    goHome: 'Wróć na stronę główną',
  },
  validation: {
    emailRequired: 'Podaj e-mail',
    nameRequired: 'Imię i nazwisko są wymagane',
    invalidEmail: 'Nieprawidłowy adres e-mail',
    invalidPhone: 'Nieprawidłowy numer telefonu',
    dateFormat: 'Użyj formatu RRRR-MM-DD',
    invalidDate: 'Nieprawidłowa data',
    familyGroupRequired: 'Wybierz grupę rodzinną',
  },
  auth: {
    title: 'Logowanie',
    description:
      'Zaloguj się, aby zarządzać treningami, klientami i rozliczeniami.',
    google: 'Kontynuuj z Google',
    or: 'lub',
    email: 'E-mail',
    password: 'Hasło',
    forgotPassword: 'Nie pamiętasz hasła?',
    submit: 'Zaloguj się',
    resetSent:
      'Jeśli istnieje konto dla {{email}}, wysłaliśmy link do ustawienia nowego hasła.',
    notConfigured: {
      title: 'Firebase nie jest skonfigurowany',
      description:
        'Dodaj ustawienia aplikacji webowej Firebase do .env.local i zrestartuj serwer. Brakuje:',
    },
    menu: {
      label: 'Konto',
      signOut: 'Wyloguj się',
    },
    errors: {
      generic: 'Coś poszło nie tak – spróbuj ponownie.',
      invalidCredential: 'Nieprawidłowy e-mail lub hasło.',
      userNotFound: 'Nie ma konta z tym adresem e-mail.',
      invalidEmail: 'Podaj poprawny adres e-mail.',
      missingPassword: 'Podaj hasło.',
      userDisabled: 'To konto zostało zablokowane.',
      tooManyRequests: 'Zbyt wiele prób. Odczekaj chwilę lub zresetuj hasło.',
      network: 'Brak połączenia z Firebase – sprawdź internet.',
      popupBlocked:
        'Przeglądarka zablokowała okno Google – zezwól na wyskakujące okna dla tej strony.',
      unauthorizedDomain:
        'Ta domena nie jest autoryzowana w Firebase (Authentication → Settings → Authorised domains).',
      providerDisabled: 'Ta metoda logowania nie jest włączona w Firebase.',
      misconfigured:
        'Nieprawidłowa konfiguracja Firebase – sprawdź wartości VITE_FIREBASE_*.',
      emailForReset:
        'Najpierw wpisz adres e-mail, potem kliknij „Nie pamiętasz hasła?”.',
    },
  },
  errors: {
    unauthorized: 'Sesja wygasła – zaloguj się ponownie.',
    invalidToken: 'Logowanie nie powiodło się – spróbuj ponownie.',
    recentSignInRequired: 'Logowanie trwało zbyt długo – spróbuj ponownie.',
    emailRequired: 'To konto nie ma adresu e-mail.',
    emailNotVerified:
      'Ten adres e-mail nie jest jeszcze potwierdzony. Użyj „Nie pamiętasz hasła?” – link z wiadomości potwierdzi adres.',
    accessDenied:
      '{{email}} nie ma dostępu do aplikacji. Poproś administratora o dodanie.',
    authNotConfigured:
      'Logowanie nie jest skonfigurowane na serwerze (brak danych Firebase Admin).',
    userNotFound: 'Nie znaleziono użytkownika #{{id}}',
    emailInUse: 'Adres e-mail {{email}} jest już używany',
    phoneInUse: 'Numer telefonu {{phone}} jest już używany',
    trainingNotFound: 'Nie znaleziono treningu #{{id}}',
    familyGroupNotFound: 'Nie znaleziono grupy rodzinnej #{{id}}',
    planNotFound: 'Nie znaleziono planu #{{id}}',
    packageNotFound: 'Nie znaleziono pakietu #{{id}}',
    periodNotFound: 'Nie znaleziono okresu rozliczeniowego',
    planStartRequired: 'Wybierz datę rozpoczęcia nowego planu',
    planMustStartAfter:
      'Nowy plan musi zaczynać się po rozpoczęciu obecnego ({{date}})',
    alreadyOnPlan: '{{name}} ma już ten plan',
    familyBilledPerPackage: 'Plany rodzinne są rozliczane pakietami',
    periodNotFinished: 'Okres jeszcze się nie zakończył',
    firstPlanCoversHistory:
      'Pierwszy plan obejmuje już wszystkie wcześniejsze treningi',
    mustStartAfterPrevious:
      'Data musi być późniejsza niż początek poprzedniego planu ({{date}})',
    onlyCurrentPlan: 'Można poprawić tylko bieżący plan',
    smsAlreadySent:
      'Dla tego planu wysłano już SMS z przypomnieniem – zmień plan zamiast go poprawiać',
    cannotRevokeOwnAccess: 'Nie możesz odebrać dostępu sobie',
    emailUsedBy: '{{email}} należy już do: {{name}}',
    paymentAlreadyRecorded:
      'Dla tego planu zapisano już płatności – zmień plan zamiast go poprawiać',
    noCalendarFiles: 'Wybierz co najmniej jeden plik .ics',
    tooManyCalendarFiles: 'Możesz przesłać naraz maksymalnie {{max}} plików',
    invalidCalendarFile: '{{file}} nie jest poprawnym plikiem iCalendar (.ics)',
    calendarFileTooLarge: 'Plik {{file}} jest większy niż {{maxMb}} MB',
    invalidCalendarId: 'Podaj poprawny identyfikator kalendarza dla {{file}}',
    duplicateCalendarId:
      'Identyfikator kalendarza {{calendarId}} występuje więcej niż raz',
  },
  users: {
    title: 'Użytkownicy',
    description: 'Trenerzy i klienci. E-mail i telefon są opcjonalne.',
    empty: 'Brak użytkowników. Dodaj kogoś lub zaimportuj treningi.',
    noResults: 'Żaden użytkownik nie pasuje do filtrów.',
    isTrainerAria: '{{name}} jest trenerem',
    fields: {
      name: 'Imię i nazwisko',
      email: 'E-mail',
      phone: 'Telefon',
      isTrainer: 'Trener',
      trainings: 'Treningi',
      lastTraining: 'Ostatni trening',
    },
    filters: {
      search: 'Szukaj po imieniu, e-mailu lub telefonie…',
      role: 'Rola',
      roles: {
        all: 'Wszyscy',
        trainers: 'Trenerzy',
        others: 'Pozostali',
      },
      noPhone: 'Bez telefonu',
      clear: 'Wyczyść filtry',
    },
    form: {
      add: 'Dodaj',
    },
    app: {
      title: 'Użytkownicy aplikacji',
      description:
        'Osoby, które mogą logować się do aplikacji. Dodaj kogoś tutaj albo nadaj dostęp podopiecznemu.',
      add: 'Dodaj użytkownika',
      addTitle: 'Nowy użytkownik aplikacji',
      addDescription:
        'Od razu może się zalogować przez Google albo e-mailem i hasłem (hasło ustawi przez „Nie pamiętasz hasła?” na stronie logowania).',
      loginEmail: 'E-mail do logowania',
      loginEmailHint: 'Tym adresem będzie się logować.',
      access: 'Dostęp',
      canSignIn: 'Może się logować',
      noAccess: 'Brak dostępu',
      empty: 'Brak użytkowników aplikacji.',
    },
    clients: {
      title: 'Podopieczni',
      description:
        'Osoby, które trenujesz. Nie mają kont – nadaj dostęp, jeśli ktoś ma się logować.',
      add: 'Dodaj podopiecznego',
      addTitle: 'Nowy podopieczny',
      addDescription:
        'Wymagane jest tylko imię i nazwisko. E-mail i telefon są opcjonalne, ale muszą być unikalne.',
      empty: 'Brak podopiecznych. Dodaj kogoś lub zaimportuj treningi.',
    },
    grant: {
      action: 'Nadaj dostęp',
      title: 'Nadaj dostęp do aplikacji',
      description:
        '<strong>{{name}}</strong> będzie mógł/mogła się logować i przejdzie do użytkowników aplikacji.',
      noRoles:
        'Nie ma jeszcze ról – każdy z dostępem widzi wszystkie treningi, podopiecznych i rozliczenia.',
      submit: 'Nadaj dostęp',
    },
    revoke: {
      action: 'Odbierz dostęp',
      title: 'Odebrać dostęp?',
      description:
        '<strong>{{name}}</strong> zostanie wylogowany/a i nie zaloguje się ponownie. Treningi i rozliczenia zostają.',
      confirm: 'Odbierz dostęp',
    },
    toast: {
      created: 'Dodano: {{name}}',
      appUserCreated: '{{name}} może się teraz logować',
      accessGranted: '{{name}} może się teraz logować',
      accessRevoked: '{{name}} nie może się już logować',
    },
  },
  dashboard: {
    title: 'Pulpit',
    subtitle: 'Podsumowanie na {{date}}',
    kpis: 'Najważniejsze liczby',
    stats: {
      week: 'Treningi w tym tygodniu',
      month: 'Treningi w tym miesiącu',
      activeClients: 'Aktywni klienci',
      cancellations: 'Odsetek odwołań',
      planned_one: 'zaplanowany jeszcze {{count}}',
      planned_few: 'zaplanowane jeszcze {{count}}',
      planned_many: 'zaplanowanych jeszcze {{count}}',
      planned_other: 'zaplanowanego jeszcze {{count}}',
      last30Days: 'Ostatnie 30 dni',
    },
    delta: {
      week: '{{value}} vs zeszły tydzień do tej pory',
      month: '{{value}} vs te same dni zeszłego miesiąca',
      rolling: '{{value}} vs poprzednie 30 dni',
      rollingPoints: '{{value}} pp vs poprzednie 30 dni',
    },
    weekly: {
      title: 'Treningi tygodniowo',
      description:
        'Odbyte treningi z ostatnich 12 tygodni. Kliknij słupek, aby zobaczyć dany tydzień.',
      trainings_one: '{{count}} trening',
      trainings_few: '{{count}} treningi',
      trainings_many: '{{count}} treningów',
      trainings_other: '{{count}} treningu',
      barLabel_one: '{{range}}: {{count}} trening',
      barLabel_few: '{{range}}: {{count}} treningi',
      barLabel_many: '{{range}}: {{count}} treningów',
      barLabel_other: '{{range}}: {{count}} treningu',
      inProgress: 'w toku',
      showTable: 'Pokaż jako tabelę',
      week: 'Tydzień',
      count: 'Treningi',
    },
    todo: {
      title: 'Do zrobienia',
      allDone: 'Nic nie czeka – wszystko zrobione.',
      unassigned_one: '{{count}} trening bez klienta',
      unassigned_few: '{{count}} treningi bez klienta',
      unassigned_many: '{{count}} treningów bez klienta',
      unassigned_other: '{{count}} treningu bez klienta',
      smsDue_one: '{{count}} SMS z przypomnieniem o płatności do wysłania',
      smsDue_few: '{{count}} SMS-y z przypomnieniem o płatności do wysłania',
      smsDue_many: '{{count}} SMS-ów z przypomnieniem o płatności do wysłania',
      smsDue_other: '{{count}} SMS-a z przypomnieniem o płatności do wysłania',
      withoutPlan_one: '{{count}} klient bez planu rozliczeń',
      withoutPlan_few: '{{count}} klienci bez planu rozliczeń',
      withoutPlan_many: '{{count}} klientów bez planu rozliczeń',
      withoutPlan_other: '{{count}} klienta bez planu rozliczeń',
      assign: 'Przypisz',
      openBilling: 'Rozliczenia',
    },
    today: {
      title: 'Dzisiaj',
      description_one: '{{count}} trening',
      description_few: '{{count}} treningi',
      description_many: '{{count}} treningów',
      description_other: '{{count}} treningu',
      empty: 'Dziś brak treningów.',
      open: 'Otwórz w treningach',
    },
    topClients: {
      title: 'Najaktywniejsi klienci',
      empty: 'Brak treningów w ostatnich 30 dniach.',
      row_one: '{{name}}: {{count}} trening',
      row_few: '{{name}}: {{count}} treningi',
      row_many: '{{name}}: {{count}} treningów',
      row_other: '{{name}}: {{count}} treningu',
    },
  },
  pagination: {
    range: '{{from}}–{{to}} z {{total}}',
    perPage: 'Na stronie',
    page: 'Strona {{page}} z {{pages}}',
    first: 'Pierwsza strona',
    previous: 'Poprzednia strona',
    next: 'Następna strona',
    last: 'Ostatnia strona',
  },
  trainings: {
    title: 'Treningi',
    description: 'Zaimportowane z kalendarzy trenerów (do miesiąca do przodu).',
    unassignedCount_one: '{{count}} trening bez klienta – przypisz go ręcznie.',
    unassignedCount_few:
      '{{count}} treningi bez klienta – przypisz je ręcznie.',
    unassignedCount_many:
      '{{count}} treningów bez klienta – przypisz je ręcznie.',
    unassignedCount_other:
      '{{count}} treningu bez klienta – przypisz je ręcznie.',
    empty:
      'Brak treningów. Kliknij „Pobierz z kalendarzy” lub wgraj plik .ics, aby je zaimportować.',
    noResults: 'Żaden trening nie pasuje do filtrów.',
    showUnassigned: 'Pokaż je',
    filters: {
      search: 'Szukaj klienta, tytułu lub notatki…',
      trainer: 'Trener',
      allTrainers: 'Wszyscy trenerzy',
      status: 'Status',
      statuses: {
        active: 'W grafiku',
        confirmed: 'Potwierdzone',
        cancelled: 'Odwołane',
        removed: 'Usunięte z kalendarza',
        ignored: 'Zignorowane',
        all: 'Wszystkie',
      },
      from: 'Od',
      to: 'Do',
      onlyUnassigned: 'Tylko nieprzypisane',
      clear: 'Wyczyść filtry',
    },
    table: {
      date: 'Data',
      time: 'Godzina',
      trainer: 'Trener',
      client: 'Klient',
      status: 'Status',
      notes: 'Notatki',
      actions: 'Akcje',
      hasNotes: 'Ma notatki',
      showNotes: 'Pokaż szczegóły i notatki',
      assign: '{{name}} – przypisz',
      calendarTitle: 'Tytuł w kalendarzu: {{title}}',
      clickToChange: 'Tytuł w kalendarzu: {{title}}. Kliknij, aby zmienić.',
    },
    calendar: {
      title: 'Kalendarz treningów',
      description:
        'Wszystkie treningi według dni. Kolory oznaczają trenerów; przerywana ramka – brak przypisanego klienta.',
      open: 'Kalendarz',
      list: 'Lista',
      previous: 'Poprzedni',
      next: 'Następny',
      today: 'Dziś',
      loading: 'Wczytywanie…',
      showHidden: 'Pokaż usunięte i zignorowane',
      views: {
        dayGridMonth: 'Miesiąc',
        timeGridWeek: 'Tydzień',
        timeGridDay: 'Dzień',
        listWeek: 'Agenda',
      },
    },
    status: {
      confirmed: 'Potwierdzony',
      cancelled: 'Odwołany',
      removed: 'Usunięty',
      removedHint: 'Nie ma go już w kalendarzu (usunięty lub przeniesiony)',
      ignored: 'Zignorowany',
      ignoredHint: 'Oznaczony jako nie-trening',
    },
    details: {
      show: 'Pokaż szczegóły',
      location: 'Miejsce',
      noNotes: 'Brak notatek we wpisie kalendarza.',
      noClient: 'Nieprzypisany (w kalendarzu: {{name}})',
      changeClient: 'Zmień klienta',
    },
    ignore: {
      action: 'To nie trening – ignoruj',
      title: 'Zignorować to wydarzenie?',
      description:
        '<strong>„{{title}}”</strong> ({{date}}) zniknie z listy i nie będzie liczone do rozliczeń.',
      applyToSameTitle:
        'Zignoruj też pozostałe wydarzenia „{{title}}” i pomijaj ten tytuł przy kolejnych importach',
      submit: 'Ignoruj',
      pending: 'Ignorowanie…',
      toast_one: 'Zignorowano wydarzenie',
      toast_few: 'Zignorowano {{count}} wydarzenia',
      toast_many: 'Zignorowano {{count}} wydarzeń',
      toast_other: 'Zignorowano {{count}} wydarzenia',
    },
    restore: {
      action: 'Przywróć jako trening',
      toast_one: 'Przywrócono wydarzenie',
      toast_few: 'Przywrócono {{count}} wydarzenia',
      toast_many: 'Przywrócono {{count}} wydarzeń',
      toast_other: 'Przywrócono {{count}} wydarzenia',
    },
    upload: {
      button: 'Wgraj .ics',
      title: 'Wgraj pliki kalendarza',
      description:
        'Zaimportuj treningi z eksportu iCalendar (.ics), np. Kalendarz Google → Ustawienia → Importuj i eksportuj.',
      chooseFiles: 'Pliki kalendarza',
      calendarId: 'Identyfikator kalendarza',
      calendarIdHint:
        'Dla kalendarza osobistego – e-mail trenera. Używaj tego samego przy każdym wgraniu, inaczej treningi się zdublują.',
      remove: 'Usuń {{file}}',
      submit: 'Importuj',
      pending: 'Importowanie…',
    },
    import: {
      button: 'Pobierz z kalendarzy',
      pending: 'Pobieranie…',
      toast: {
        title_one:
          'Zaimportowano {{count}} kalendarz: nowe {{created}}, zaktualizowane {{updated}}',
        title_few:
          'Zaimportowano {{count}} kalendarze: nowe {{created}}, zaktualizowane {{updated}}',
        title_many:
          'Zaimportowano {{count}} kalendarzy: nowe {{created}}, zaktualizowane {{updated}}',
        title_other:
          'Zaimportowano {{count}} kalendarza: nowe {{created}}, zaktualizowane {{updated}}',
        cancelled_one: '{{count}} odwołany',
        cancelled_few: '{{count}} odwołane',
        cancelled_many: '{{count}} odwołanych',
        cancelled_other: '{{count}} odwołanego',
        ignored_one: '{{count}} zignorowany',
        ignored_few: '{{count}} zignorowane',
        ignored_many: '{{count}} zignorowanych',
        ignored_other: '{{count}} zignorowanego',
        removed_one: '{{count}} usunięty z kalendarza',
        removed_few: '{{count}} usunięte z kalendarza',
        removed_many: '{{count}} usuniętych z kalendarza',
        removed_other: '{{count}} usuniętego z kalendarza',
        skipped_one: 'pominięto {{count}} wydarzenie niebędące treningiem',
        skipped_few: 'pominięto {{count}} wydarzenia niebędące treningami',
        skipped_many: 'pominięto {{count}} wydarzeń niebędących treningami',
        skipped_other: 'pominięto {{count}} wydarzenia niebędącego treningiem',
        peopleCreated:
          'utworzeni trenerzy: {{trainers}}, utworzeni klienci: {{clients}}',
        unassigned_one: '{{count}} wymaga przypisania klienta',
        unassigned_few: '{{count}} wymagają przypisania klienta',
        unassigned_many: '{{count}} wymaga przypisania klienta',
        unassigned_other: '{{count}} wymaga przypisania klienta',
      },
    },
    assign: {
      title: 'Przypisz klienta',
      description:
        'Wpis w kalendarzu <strong>„{{title}}”</strong> ({{trainer}}, {{date}}).',
      existingClient: 'Istniejący klient',
      chooseUser: 'Wybierz osobę…',
      suggested: 'Sugerowani',
      allUsers: 'Wszyscy użytkownicy',
      trainer: 'trener',
      applyToSameName:
        'Przypisz też pozostałe nieprzypisane treningi „{{name}}” i zapamiętaj tę nazwę przy kolejnych importach',
      submit: 'Przypisz',
      assigning: 'Przypisywanie…',
      orCreate: '…lub dodaj nowego klienta',
      createAndAssign: 'Dodaj i przypisz',
      toast_one: 'Przypisano klienta',
      toast_few: 'Przypisano klienta do {{count}} treningów',
      toast_many: 'Przypisano klienta do {{count}} treningów',
      toast_other: 'Przypisano klienta do {{count}} treningu',
    },
  },
  billing: {
    title: 'Rozliczenia',
    description:
      'Plany rozliczeniowe klientów. Zaznacz pole, gdy SMS z przypomnieniem o płatności za zakończony okres został wysłany.',
    wholeHistory: 'Cała historia',
    plans: {
      trainings_4: 'Co 4 treningi',
      trainings_8: 'Co 8 treningów',
      trainings_12: 'Co 12 treningów',
      monthly: 'Raz w miesiącu',
      family: 'Pakiet rodzinny',
    },
    tabs: {
      custom: 'Niestandardowe',
      comingSoon: 'Wkrótce',
      withoutPlan: 'Bez planu',
    },
    actions: {
      changePlan: 'Zmień plan',
      history: 'Historia',
      assignPlan: 'Przypisz plan',
    },
    individual: {
      client: 'Klient',
      since: 'Od',
      periods: 'Okresy (✓ = SMS z przypomnieniem wysłany)',
      empty: 'Nikt nie ma tego planu. Przypisz plany w zakładce „Bez planu”.',
    },
    periods: {
      empty: 'Brak odbytych treningów',
      emptySince: 'Brak odbytych treningów od {{date}}',
      inProgress: 'w trakcie',
      trainings_one: '{{count}} trening',
      trainings_few: '{{count}} treningi',
      trainings_many: '{{count}} treningów',
      trainings_other: '{{count}} treningu',
      showAll_one: 'Pokaż {{count}} okres',
      showAll_few: 'Pokaż wszystkie {{count}} okresy',
      showAll_many: 'Pokaż wszystkie {{count}} okresów',
      showAll_other: 'Pokaż wszystkie {{count}} okresu',
      showLess: 'Pokaż mniej',
      period: 'Okres',
      trainingsHeader: 'Treningi',
      sms: 'SMS',
    },
    payment: {
      label: 'Opłacono',
      placeholder: 'np. przelew 12.11',
      aria: 'Opłacono – {{period}}',
    },
    sms: {
      sentAria: 'SMS z przypomnieniem wysłany',
      sentOn: 'SMS {{date}}',
      due: 'Wyślij SMS',
      dueCount_one: '{{count}} SMS do wysłania',
      dueCount_few: '{{count}} SMS-y do wysłania',
      dueCount_many: '{{count}} SMS-ów do wysłania',
      dueCount_other: '{{count}} SMS-a do wysłania',
    },
    unmarkSms: {
      title: 'Cofnąć oznaczenie SMS-a?',
      period:
        'Okres {{period}} wróci na listę „do wysłania”. Jego daty zostaną ponownie wyliczone z aktualnych treningów, więc mogą się przesunąć, jeśli w międzyczasie coś zmieniło się w kalendarzu.',
      month: '{{period}} wróci na listę „do wysłania”.',
      package_one:
        'Pakiet na {{count}} trening (od {{date}}) wróci na listę „do wysłania”.',
      package_few:
        'Pakiet na {{count}} treningi (od {{date}}) wróci na listę „do wysłania”.',
      package_many:
        'Pakiet na {{count}} treningów (od {{date}}) wróci na listę „do wysłania”.',
      package_other:
        'Pakiet na {{count}} treningu (od {{date}}) wróci na listę „do wysłania”.',
      appOnly:
        'To zmienia tylko oznaczenie w aplikacji – nie wpływa na wiadomość, którą klient już dostał.',
      keep: 'Zostaw zaznaczone',
      confirm: 'Cofnij oznaczenie',
    },
    withoutPlan: {
      empty: 'Każdy klient ma plan rozliczeniowy.',
      firstTraining: 'Pierwszy trening',
    },
    assign: {
      assignTitle: 'Przypisz plan – {{name}}',
      changeTitle: 'Zmień plan – {{name}}',
      currently:
        'Obecnie: {{plan}}{{group}} od {{since}}. Obecny plan kończy się dzień przed startem nowego; jego historia zostaje zachowana.',
      firstPlan:
        'To pierwszy plan, więc obejmuje wszystkie treningi klienta – także wcześniejsze.',
      plan: 'Plan',
      familyGroup: 'Grupa rodzinna',
      newGroup: '+ Nowa grupa…',
      newGroupName: 'Nazwa nowej grupy',
      newGroupPlaceholder: 'np. Kowalscy',
      from: 'Od',
      tooEarly: 'Data musi być późniejsza niż {{date}} (start obecnego planu).',
      startsWithFirstTraining:
        'Rozliczanie zaczyna się od pierwszego treningu.',
      startsWithFirstTrainingOn:
        'Rozliczanie zaczyna się od pierwszego treningu ({{date}}).',
    },
    correct: {
      title: 'Popraw pomyłkę w obecnym planie',
      description:
        'Poprawia plan bez tworzenia wpisu w historii. Możliwe tylko, dopóki nie wysłano dla niego SMS-a z przypomnieniem.',
      startDate: 'Data rozpoczęcia',
      saveStartDate: 'Zapisz datę rozpoczęcia',
      remove: 'Usuń plan',
    },
    history: {
      title: 'Historia rozliczeń – {{name}}',
      description:
        'Plany nigdy nie są nadpisywane: każda zmiana tworzy nowy wpis.',
      empty: 'Brak planów.',
      now: 'teraz',
      current: 'Obecny',
      familyHint:
        'Rozliczany pakietami rodzinnymi – zobacz zakładkę „Pakiet rodzinny”.',
    },
    family: {
      empty:
        'Brak grup rodzinnych. Przypisz klientowi plan „Pakiet rodzinny”, aby utworzyć grupę.',
      memberSince: '{{name}} (od {{date}})',
      noMembers: 'Brak obecnych członków',
      addPackage: 'Dodaj pakiet',
      uncovered_one:
        '{{count}} trening nie jest objęty żadnym pakietem – dodaj nowy pakiet.',
      uncovered_few:
        '{{count}} treningi nie są objęte żadnym pakietem – dodaj nowy pakiet.',
      uncovered_many:
        '{{count}} treningów nie jest objętych żadnym pakietem – dodaj nowy pakiet.',
      uncovered_other:
        '{{count}} treningu nie jest objęte żadnym pakietem – dodaj nowy pakiet.',
      noPackages: 'Brak pakietów.',
      packageFrom: 'od {{date}}',
      usedBetween: 'wykorzystany {{from}} – {{to}}',
      usedUp: 'Wykorzystany – wyślij SMS',
      left_one: 'został {{count}}',
      left_few: 'zostały {{count}}',
      left_many: 'zostało {{count}}',
      left_other: 'zostało {{count}}',
      newPackageTitle: 'Nowy pakiet – {{name}}',
      newPackageDescription:
        'Treningi członków od daty startu wykorzystują pakiet po wyczerpaniu poprzednich.',
      size: 'Liczba treningów',
      notes: 'Notatki',
    },
    toast: {
      planAssigned: 'Przypisano plan',
      paymentSaved: 'Zapisano informację o płatności',
      startCorrected: 'Poprawiono datę rozpoczęcia',
      planRemoved: 'Usunięto plan',
      groupCreated: 'Utworzono grupę rodzinną',
      packageAdded: 'Dodano pakiet',
    },
  },
} as const
