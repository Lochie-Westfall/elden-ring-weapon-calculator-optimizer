import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  ThemeProvider,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
  type Theme,
  Tabs,
  Tab,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBackRounded";
import WeaponListSettings from "./WeaponListSettings.tsx";
import WeaponTable from "./weaponTable/WeaponTable.tsx";
import useWeaponTableRows from "./weaponTable/useWeaponTableRows.tsx";
import OptimizerTab from "../optimizer/OptimizerTab.tsx";
import theme from "./theme.ts";
import regulationVersions, { type RegulationVersionName, type RegulationVersion } from "./regulationVersions.tsx";
import useWeapons from "./useWeapons.ts";
import useAppState from "./useAppState.ts";
import AppBar from "./AppBar.tsx";
import RegulationVersionPicker from "./RegulationVersionPicker.tsx";
import WeaponTypePicker from "./WeaponTypePicker.tsx";
import AffinityPicker from "./AffinityPicker.tsx";
import Footer from "./Footer.tsx";
import MiscFilterPicker from "./MiscFilterPicker.tsx";
import WeaponPicker, { makeWeaponOptionsFromWeapon } from "./WeaponPicker.tsx";
import type { Weapon } from "../calculator/weapon.ts";

const useMenuState = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery<Theme>(theme.breakpoints.down("md"));

  // Open the menu by default on large viewports. On mobile-sized viewports, the menu is an overlay
  // that partially covers the rest of the screen.
  const [menuOpenMobile, setMenuOpenMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(true);

  /* eslint-disable no-restricted-globals */
  const onMenuOpenChanged = useCallback(
    (open: boolean) => {
      if (isMobile) {
        if (open) {
          history.replaceState(null, "");
          history.pushState(null, "");
          setMenuOpenMobile(true);
        } else {
          history.back();
          setMenuOpenMobile(false);
        }
      } else {
        setMenuOpen(open);
      }
    },
    [isMobile],
  );

  useEffect(() => {
    if (menuOpenMobile) {
      if (!isMobile) {
        history.back();
        setMenuOpenMobile(false);
      }

      const onPopState = (evt: PopStateEvent) => {
        setMenuOpenMobile(false);
        evt.stopPropagation();
      };

      window.addEventListener("popstate", onPopState, false);
      return () => window.removeEventListener("popstate", onPopState, false);
    }
  }, [isMobile, menuOpenMobile]);
  /* eslint-enable no-restricted-globals */

  return {
    isMobile,
    menuOpen,
    menuOpenMobile,
    onMenuOpenChanged,
  };
};

function RegulationVersionAlert({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState(false);

  if (!children || dismissed) {
    return null;
  }

  return (
    <Alert icon={false} severity="info" onClose={() => setDismissed(true)}>
      {children}
    </Alert>
  );
}

// Helper component for Tab Panels
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function App() {
  const {
    regulationVersionName,
    affinityIds,
    weaponTypes,
    attributes,
    includeDLC,
    effectiveOnly,
    splitDamage,
    twoHanding,
    upgradeLevel,
    groupWeaponTypes,
    numericalScaling,
    sortBy,
    reverse,
    selectedWeapons,
    setRegulationVersionName,
    setAffinityIds,
    setWeaponTypes,
    setAttribute,
    setIncludeDLC,
    setEffectiveOnly,
    setSplitDamage,
    setTwoHanding,
    setUpgradeLevel,
    setGroupWeaponTypes,
    setNumericalScaling,
    setSortBy,
    setReverse,
    setSelectedWeapons,
  } = useAppState();

  const { isMobile, menuOpen, menuOpenMobile, onMenuOpenChanged } = useMenuState();
  const [currentTab, setCurrentTab] = useState(0);

  const offset = 0;
  const limit = 200;
  const { weapons, loading: isLoadingWeapons, error: weaponError } = useWeapons(regulationVersionName);

  const currentRegulationVersionName = regulationVersionName in regulationVersions ? regulationVersionName : "latest";
  const regulationVersion: RegulationVersion = regulationVersions[currentRegulationVersionName as RegulationVersionName];

  const { rowGroups, attackPowerTypes, spellScaling, total } = useWeaponTableRows({
    weapons,
    regulationVersion,
    offset,
    limit,
    sortBy,
    reverse,
    affinityIds,
    weaponTypes,
    attributes,
    includeDLC,
    effectiveOnly,
    twoHanding,
    upgradeLevel,
    groupWeaponTypes,
    disableWeaponTypeFilter: regulationVersion.disableWeaponTypeFilter,
    selectedWeapons,
  });

  const tablePlaceholder = useMemo(
    () =>
      isLoadingWeapons ? (
        <>
          <Typography variant="body1" align="center" sx={{ alignSelf: "end" }}>
            Loading weapon data
          </Typography>
          <Box display="grid" sx={{ alignSelf: "start", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        </>
      ) : (
        <Typography variant="body1" align="center" sx={{ alignSelf: "center" }}>
          No weapons match your selections
        </Typography>
      ),
    [isLoadingWeapons],
  );

  const tableFooter = useMemo(
    () =>
      total > limit ? (
        <Typography variant="body1" align="center" sx={{ alignSelf: "center" }}>
          {total} weapons match your selections - showing the first {limit}
        </Typography>
      ) : undefined,
    [total, limit],
  );

  let calculatorContent: ReactNode;
  if (weaponError) {
    calculatorContent = (
      <Alert severity="error" sx={{ my: 3 }}>
        Oops, something went wrong loading weapons ({weaponError.message})
      </Alert>
    );
  } else {
    calculatorContent = (
      <>
        <WeaponListSettings
          breakpoint={menuOpen ? "lg" : "md"}
          attributes={attributes}
          twoHanding={twoHanding}
          upgradeLevel={upgradeLevel}
          maxUpgradeLevel={regulationVersion.maxUpgradeLevel}
          splitDamage={splitDamage}
          groupWeaponTypes={groupWeaponTypes}
          numericalScaling={numericalScaling}
          onAttributeChanged={setAttribute}
          onTwoHandingChanged={setTwoHanding}
          onUpgradeLevelChanged={setUpgradeLevel}
          onSplitDamageChanged={setSplitDamage}
          onGroupWeaponTypesChanged={setGroupWeaponTypes}
          onNumericalScalingChanged={setNumericalScaling}
        />
        <RegulationVersionAlert key={currentRegulationVersionName}>
          {regulationVersion.info}
        </RegulationVersionAlert>
        <WeaponTable
          rowGroups={rowGroups}
          placeholder={tablePlaceholder}
          footer={tableFooter}
          sortBy={sortBy}
          reverse={reverse}
          splitDamage={splitDamage}
          splitSpellScaling={!!regulationVersion.splitSpellScaling}
          numericalScaling={numericalScaling}
          attackPowerTypes={attackPowerTypes}
          spellScaling={spellScaling}
          onSortByChanged={setSortBy}
          onReverseChanged={setReverse}
        />
      </>
    );
  }

  const showIncludeDLC = currentRegulationVersionName === "latest";
  const includeDLCWeaponTypes = includeDLC || !showIncludeDLC;

  const weaponPickerOptions = useMemo(() => {
    const dedupedWeaponsByWeaponName = [
      ...weapons
        .reduce((acc: Map<string, Weapon>, weapon: Weapon) => {
          return acc.set(weapon.weaponName, weapon);
        }, new Map<string, Weapon>())
        .values(),
    ].filter((weapon) => (includeDLC ? true : !weapon.dlc));
    return makeWeaponOptionsFromWeapon(dedupedWeaponsByWeaponName);
  }, [weapons, includeDLC]);

  const drawerContent = (
    <>
      <RegulationVersionPicker
        regulationVersionName={currentRegulationVersionName}
        onRegulationVersionNameChanged={setRegulationVersionName}
      />
      <MiscFilterPicker
        showIncludeDLC={showIncludeDLC}
        includeDLC={includeDLC}
        effectiveOnly={effectiveOnly}
        onIncludeDLCChanged={setIncludeDLC}
        onEffectiveOnlyChanged={setEffectiveOnly}
      />
      <WeaponPicker
        selectedWeapons={selectedWeapons}
        onSelectedWeaponsChanged={setSelectedWeapons}
        weaponOptions={weaponPickerOptions}
        loading={isLoadingWeapons}
      />
      <AffinityPicker
        affinityOptions={regulationVersion.affinityOptions}
        selectedAffinityIds={affinityIds}
        onAffinityIdsChanged={setAffinityIds}
      />
      {!regulationVersion.disableWeaponTypeFilter && (
        <WeaponTypePicker
          includeDLCWeaponTypes={includeDLCWeaponTypes}
          weaponTypes={weaponTypes}
          onWeaponTypesChanged={setWeaponTypes}
        />
      )}
    </>
  );

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <AppBar
        menuOpen={isMobile ? menuOpenMobile : menuOpen}
        onMenuOpenChanged={onMenuOpenChanged}
      />

      <Divider />

      <Box
        display="grid"
        sx={(theme) => ({
          px: 2,
          py: 3,
          [theme.breakpoints.up("sm")]: {
            px: 3,
          },
          [theme.breakpoints.up("md")]: {
            gridTemplateColumns: menuOpen ? `320px 1fr` : "1fr",
            alignContent: "start",
            alignItems: "start",
            gap: 2,
            px: 3,
          },
        })}
      >
        {menuOpen && (
          <Box
            display="grid"
            sx={(theme) => ({
              [theme.breakpoints.down("md")]: {
                display: "none",
              },
              gap: 2,
            })}
          >
            {drawerContent}
          </Box>
        )}

        <Drawer
          variant="temporary"
          open={menuOpenMobile}
          onClose={() => onMenuOpenChanged(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: "368px", maxWidth: "100vw" },
          }}
        >
          <Toolbar>
            <IconButton
              size="large"
              color="inherit"
              edge="start"
              role="checkbox"
              aria-label="Close Menu"
              sx={{ mr: 1 }}
              onClick={() => onMenuOpenChanged(false)}
            >
              <ArrowBackIcon />
            </IconButton>
          </Toolbar>

          <Divider />

          <Box display="grid" sx={{ gap: 2, p: 3 }}>
            {drawerContent}
          </Box>
        </Drawer>

        <Box display="grid" sx={{ gap: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={currentTab} onChange={handleTabChange} aria-label="Calculator and Optimizer Tabs">
              <Tab label="Calculator" id="simple-tab-0" aria-controls="simple-tabpanel-0" />
              <Tab label="Optimizer" id="simple-tab-1" aria-controls="simple-tabpanel-1" />
            </Tabs>
          </Box>

          <TabPanel value={currentTab} index={0}>
            {calculatorContent}
          </TabPanel>
          <TabPanel value={currentTab} index={1}>
            <OptimizerTab
              weapons={weapons}
              regulationVersion={regulationVersion}
              attackPowerTypes={Array.from(attackPowerTypes)}
              isLoadingWeapons={isLoadingWeapons}
            />
          </TabPanel>

          <Footer />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
