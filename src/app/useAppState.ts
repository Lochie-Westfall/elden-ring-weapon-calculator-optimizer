import { useEffect, useMemo, useState } from "react";
import { type Attribute, type Attributes, WeaponType } from "../calculator/calculator.ts";
import type { SortBy } from "../search/sortWeapons.ts";
import type { RegulationVersionName } from "./regulationVersions.tsx";
import regulationVersions from "./regulationVersions.tsx";
import { dlcWeaponTypes } from "./uiUtils.ts";
import { type WeaponOption } from "./WeaponPicker.tsx";

interface AppState {
  readonly regulationVersionName: RegulationVersionName;
  readonly attributes: Attributes;
  readonly twoHanding: boolean;
  readonly upgradeLevel: number;
  readonly weaponTypes: readonly WeaponType[];
  readonly affinityIds: readonly number[];
  readonly includeDLC: boolean;
  readonly effectiveOnly: boolean;
  readonly splitDamage: boolean;
  readonly groupWeaponTypes: boolean;
  readonly numericalScaling: boolean;
  readonly sortBy: SortBy;
  readonly reverse: boolean;
  readonly selectedWeapons: WeaponOption[];
}

interface UpdateAppState extends AppState {
  setRegulationVersionName(regulationVersionName: RegulationVersionName): void;
  setAttribute(attribute: Attribute, value: number): void;
  setTwoHanding(twoHanding: boolean): void;
  setUpgradeLevel(upgradeLevel: number): void;
  setWeaponTypes(weaponTypes: readonly WeaponType[]): void;
  setAffinityIds(affinityIds: readonly number[]): void;
  setIncludeDLC(includeDLC: boolean): void;
  setEffectiveOnly(effectiveOnly: boolean): void;
  setSplitDamage(splitDamage: boolean): void;
  setGroupWeaponTypes(groupWeaponTypes: boolean): void;
  setNumericalScaling(numericalScaling: boolean): void;
  setSortBy(sortBy: SortBy): void;
  setReverse(reverse: boolean): void;
  setSelectedWeapons(weapons: WeaponOption[]): void;
}

const defaultAppState: AppState = {
  regulationVersionName: "latest",
  attributes: {
    vig: 10, min: 10, end: 10, str: 30, dex: 30, int: 30, fai: 30, arc: 30,
  },
  twoHanding: false,
  upgradeLevel: 25,
  weaponTypes: [WeaponType.AXE],
  affinityIds: [0, -1],
  includeDLC: true,
  effectiveOnly: false,
  splitDamage: true,
  groupWeaponTypes: false,
  numericalScaling: false,
  sortBy: "totalAttack",
  reverse: false,
  selectedWeapons: [],
};

/**
 * @returns the initial state of the app, restored from localstorage and the URL if available
 */
function getInitialAppState(): AppState {
  let loadedState: Partial<AppState> = {};
  try {
    const storedAppStateString = localStorage.getItem("appState");
    if (storedAppStateString) {
      const parsed = JSON.parse(storedAppStateString);
      // Ensure parsed is an object before assigning
      if (parsed && typeof parsed === 'object') {
        loadedState = parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load or parse state from localStorage:", e);
    loadedState = {}; // Reset to empty on error
  }

  // Determine regulation version (URL > Loaded > Default)
  let regulationVersionName = defaultAppState.regulationVersionName;
  const urlVersionName = window.location.pathname.substring(1);
  if (urlVersionName && urlVersionName in regulationVersions) {
    regulationVersionName = urlVersionName as RegulationVersionName;
  } else if (loadedState.regulationVersionName && loadedState.regulationVersionName in regulationVersions) {
    regulationVersionName = loadedState.regulationVersionName;
  } // else stays default

  // Merge attributes: Start with defaults, overlay valid loaded values.
  const defaultAttrs = defaultAppState.attributes;
  const loadedAttrs = (loadedState.attributes && typeof loadedState.attributes === 'object')
    ? loadedState.attributes
    : {}; // Ensure loadedAttrs is an object
  const attributes: Attributes = { ...defaultAttrs }; // Start with a copy of defaults
  for (const key of Object.keys(defaultAttrs) as Array<keyof Attributes>) {
    const potentialLoadedValue = (loadedAttrs as Partial<Attributes>)[key];
    // Use loaded value only if it exists and is a valid number
    if (key in loadedAttrs && potentialLoadedValue !== undefined && typeof potentialLoadedValue === 'number') {
      attributes[key] = potentialLoadedValue;
    }
    // Otherwise, the key retains its default value from the initial spread
  }

  // Construct the final state object correctly
  const finalState: AppState = {
    regulationVersionName,
    attributes, // Use the fully merged & validated attributes
    twoHanding: typeof loadedState.twoHanding === 'boolean' ? loadedState.twoHanding : defaultAppState.twoHanding,
    upgradeLevel: typeof loadedState.upgradeLevel === 'number' ? loadedState.upgradeLevel : defaultAppState.upgradeLevel,
    weaponTypes: Array.isArray(loadedState.weaponTypes) ? loadedState.weaponTypes : defaultAppState.weaponTypes, // Basic array check
    affinityIds: Array.isArray(loadedState.affinityIds) ? loadedState.affinityIds : defaultAppState.affinityIds,
    includeDLC: typeof loadedState.includeDLC === 'boolean' ? loadedState.includeDLC : defaultAppState.includeDLC,
    effectiveOnly: typeof loadedState.effectiveOnly === 'boolean' ? loadedState.effectiveOnly : defaultAppState.effectiveOnly,
    splitDamage: typeof loadedState.splitDamage === 'boolean' ? loadedState.splitDamage : defaultAppState.splitDamage,
    groupWeaponTypes: typeof loadedState.groupWeaponTypes === 'boolean' ? loadedState.groupWeaponTypes : defaultAppState.groupWeaponTypes,
    numericalScaling: typeof loadedState.numericalScaling === 'boolean' ? loadedState.numericalScaling : defaultAppState.numericalScaling,
    sortBy: typeof loadedState.sortBy === 'string' ? loadedState.sortBy as SortBy : defaultAppState.sortBy, // Add type assertion
    reverse: typeof loadedState.reverse === 'boolean' ? loadedState.reverse : defaultAppState.reverse,
    selectedWeapons: Array.isArray(loadedState.selectedWeapons) ? loadedState.selectedWeapons : defaultAppState.selectedWeapons,
  };

  // Add deeper validation if needed (e.g., check array contents)

  return finalState;
}

/**
 * Store the state of the app in localstorage and the URL so it can be restored on future visits
 */
function onAppStateChanged(appState: AppState) {
  localStorage.setItem("appState", JSON.stringify(appState));
}

function updateUrl(regulationVersionName: RegulationVersionName) {
  window.history.replaceState(
    null,
    "",
    `/${regulationVersionName === "latest" ? "" : regulationVersionName}`,
  );
}

/**
 * Manages all of the user selectable filters and display options, and saves/loads them in
 * localStorage for use on future page loads
 */
export default function useAppState() {
  const [appState, setAppState] = useState<AppState>(() => {
    return getInitialAppState();
  });

  useEffect(() => {
    onAppStateChanged(appState);
    updateUrl(appState.regulationVersionName);
  }, [appState]);

  useEffect(() => {
    function onPopState() {
      updateUrl(appState.regulationVersionName);
    }

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [appState.regulationVersionName]);

  const changeHandlers = useMemo<Omit<UpdateAppState, keyof AppState>>(
    () => ({
      setRegulationVersionName(regulationVersionName: RegulationVersionName) {
        setAppState((prevAppState: AppState) => ({ ...prevAppState, regulationVersionName }));
      },
      setAttribute(attribute: Attribute, value: number) {
        setAppState((prevAppState: AppState) => ({
          ...prevAppState,
          attributes: { ...prevAppState.attributes, [attribute]: value },
        }));
      },
      setTwoHanding(twoHanding: boolean) {
        setAppState((prevAppState: AppState) => ({ ...prevAppState, twoHanding }));
      },
      setUpgradeLevel(upgradeLevel: number) {
        setAppState((prevAppState: AppState) => ({ ...prevAppState, upgradeLevel }));
      },
      setWeaponTypes(weaponTypes: readonly WeaponType[]) {
        setAppState((prevAppState: AppState) => ({ ...prevAppState, weaponTypes }));
      },
      setAffinityIds(affinityIds: readonly number[]) {
        setAppState((prevAppState: AppState) => ({ ...prevAppState, affinityIds }));
      },
      setIncludeDLC(includeDLC: boolean) {
        setAppState((prevAppState: AppState) => ({
          ...prevAppState,
          includeDLC,
          weaponTypes: includeDLC
            ? prevAppState.weaponTypes
            : prevAppState.weaponTypes.filter(
              (weaponType) => !dlcWeaponTypes.includes(weaponType),
            ),
        }));
      },
      setEffectiveOnly(effectiveOnly: boolean) {
        setAppState((prevAppState: AppState) => ({ ...prevAppState, effectiveOnly }));
      },
      setSplitDamage(splitDamage: boolean) {
        setAppState((prevAppState: AppState) => ({ ...prevAppState, splitDamage }));
      },
      setGroupWeaponTypes(groupWeaponTypes: boolean) {
        setAppState((prevAppState: AppState) => ({ ...prevAppState, groupWeaponTypes }));
      },
      setNumericalScaling(numericalScaling: boolean) {
        setAppState((prevAppState: AppState) => ({ ...prevAppState, numericalScaling }));
      },
      setSortBy(sortBy: SortBy) {
        setAppState((prevAppState: AppState) => ({ ...prevAppState, sortBy }));
      },
      setReverse(reverse: boolean) {
        setAppState((prevAppState: AppState) => ({ ...prevAppState, reverse }));
      },
      setSelectedWeapons(selectedWeapons: WeaponOption[]) {
        setAppState((prevAppState: AppState) => ({ ...prevAppState, selectedWeapons }));
      },
    }),
    [],
  );

  return useMemo(() => ({ ...appState, ...changeHandlers }), [appState, changeHandlers]);
}
