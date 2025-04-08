import { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    type SelectChangeEvent,
    Typography,
    Paper,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
} from '@mui/material';
import type { Attributes, Weapon } from '../calculator/calculator';
import { AttackPowerType } from '../calculator/attackPowerTypes';
import { allAttributes } from '../calculator/attributes';
import { allDamageTypes, allStatusTypes } from '../calculator/attackPowerTypes';
import { StartingClass, getStartingStats, calculateLevel } from './utils';
import { optimizeBuild } from './optimizer';
import type { OptimizerInput, OptimizerResult, ObjectiveWeights } from './types';
import NumberTextField from '../app/NumberTextField';
import WeaponPicker, { type WeaponOption, makeWeaponOptionsFromWeapon } from '../app/WeaponPicker';
import { getAttributeLabel, maxRegularUpgradeLevel, toSpecialUpgradeLevel, damageTypeLabels } from '../app/uiUtils';
import type { RegulationVersion } from '../app/regulationVersions';

interface OptimizerTabProps {
    weapons: Weapon[];
    regulationVersion: RegulationVersion;
    attackPowerTypes: AttackPowerType[];
    isLoadingWeapons: boolean;
}

// Helper to create default weights
const getDefaultWeights = (): ObjectiveWeights => ({
    attackPower: Object.fromEntries(allDamageTypes.map(t => [t, 1])) as Record<AttackPowerType, number>,
    statusEffect: Object.fromEntries(allStatusTypes.map(t => [t, 1])) as Record<AttackPowerType, number>,
    spellScaling: {},
});

export default function OptimizerTab({ weapons, isLoadingWeapons }: OptimizerTabProps) {
    const [startingClass, setStartingClass] = useState<StartingClass>(StartingClass.VAGABOND);
    const [targetLevel, setTargetLevel] = useState<number>(150);
    const [selectedWeaponOptions, setSelectedWeaponOptions] = useState<WeaponOption[]>([]);
    const [upgradeLevel, setUpgradeLevel] = useState<number>(maxRegularUpgradeLevel);
    const [objectiveWeights, setObjectiveWeights] = useState<ObjectiveWeights>(getDefaultWeights());
    const [minimumAttributes, setMinimumAttributes] = useState<Partial<Record<keyof Attributes, number>>>({});
    const [weaponWeights, setWeaponWeights] = useState<Record<string, number>>({});

    const [optimizationResult, setOptimizationResult] = useState<OptimizerResult | null>(null);
    const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleStartingClassChange = useCallback((event: SelectChangeEvent<string>) => {
        setStartingClass(event.target.value as StartingClass);
        setOptimizationResult(null); // Reset result on input change
    }, []);

    const handleTargetLevelChange = useCallback((value: number) => {
        setTargetLevel(value);
        setOptimizationResult(null);
    }, []);

    const handleWeaponChange = useCallback((options: WeaponOption[]) => {
        setSelectedWeaponOptions(options);
        setOptimizationResult(null);
        setWeaponWeights(prev => {
            const newWeights: Record<string, number> = {};
            for (const option of options) {
                newWeights[option.value] = prev[option.value] ?? 1;
            }
            return newWeights;
        });
    }, []);

    const handleUpgradeLevelChange = useCallback((event: SelectChangeEvent<string | number>) => {
        const newLevel = typeof event.target.value === 'string' ? parseInt(event.target.value, 10) : event.target.value;
        setUpgradeLevel(newLevel);
        setOptimizationResult(null);
    }, []);

    const handleWeightChange = useCallback((category: keyof ObjectiveWeights, type: AttackPowerType, value: number) => {
        setObjectiveWeights(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [type]: value,
            },
        }));
        setOptimizationResult(null);
    }, []);

    const handleMinimumChange = useCallback((attribute: keyof Attributes, value: number) => {
        setMinimumAttributes(prev => {
            const newMins = { ...prev };
            if (isNaN(value) || value <= 0 || value > 99) {
                delete newMins[attribute];
            } else {
                newMins[attribute] = Math.max(1, value);
            }
            return newMins;
        });
        setOptimizationResult(null);
    }, []);

    const handleWeaponWeightChange = useCallback((weaponName: string, weight: number) => {
        setWeaponWeights(prev => ({
            ...prev,
            [weaponName]: isNaN(weight) ? 1 : Math.max(0, weight)
        }));
    }, []);

    const selectedWeaponDetails = useMemo(() => {
        if (selectedWeaponOptions.length === 0 || !weapons) return null;
        const firstOption = selectedWeaponOptions[0];
        return weapons.find(w => w.name === firstOption.value) ?? null;
    }, [selectedWeaponOptions, weapons]);

    const maxUpgradeLevelForSelected = useMemo(() => {
        if (!selectedWeaponDetails?.attack) return maxRegularUpgradeLevel;
        const actualMaxLevel = selectedWeaponDetails.attack.length - 1;
        return actualMaxLevel;
    }, [selectedWeaponDetails]);

    useEffect(() => {
        if (upgradeLevel > maxUpgradeLevelForSelected) {
            setUpgradeLevel(maxUpgradeLevelForSelected);
            setOptimizationResult(null);
        }
    }, [upgradeLevel, maxUpgradeLevelForSelected, setUpgradeLevel]);

    const handleOptimizeClick = useCallback(() => {
        // Check if any weapons are selected
        if (selectedWeaponOptions.length === 0) {
            setError("Please select at least one weapon.");
            return;
        }

        // Get details for ALL selected weapons
        const selectedWeaponsDetails: Weapon[] = selectedWeaponOptions
            .map(option => weapons.find(w => w.name === option.value))
            .filter((w): w is Weapon => w !== undefined); // Type guard to filter out undefined

        if (selectedWeaponsDetails.length !== selectedWeaponOptions.length) {
            // This shouldn't happen if options are derived correctly, but good to check
            setError("Could not find details for all selected weapons.");
            return;
        }

        setError(null);
        setIsOptimizing(true);
        setOptimizationResult(null);

        const baseStats = getStartingStats(startingClass);
        if (targetLevel < baseStats.level) {
            setError(`Target level (${targetLevel}) cannot be lower than starting level (${baseStats.level}) for ${startingClass}.`);
            setIsOptimizing(false);
            return;
        }

        setTimeout(() => {
            try {
                // Pass the array of weapons
                const input: OptimizerInput = {
                    startingClass,
                    targetLevel,
                    weapons: selectedWeaponsDetails,
                    upgradeLevel,
                    objectiveWeights,
                    minimumAttributes,
                    weaponWeights,
                };
                const result = optimizeBuild(input);
                setOptimizationResult(result);
            } catch (e) {
                console.error("Optimization failed:", e);
                setError(e instanceof Error ? e.message : "An unknown error occurred during optimization.");
            } finally {
                setIsOptimizing(false);
            }
        }, 10);

    }, [
        selectedWeaponOptions, // Depend on the options array
        weapons, // Need weapons list for mapping
        startingClass,
        targetLevel,
        upgradeLevel,
        objectiveWeights,
        minimumAttributes,
        weaponWeights,
    ]);

    const weaponPickerOptions = useMemo(() => {
        if (isLoadingWeapons) return [];
        const dedupedWeapons = [...weapons.reduce((acc, weapon) => acc.set(weapon.weaponName, weapon), new Map<string, Weapon>()).values()];
        return makeWeaponOptionsFromWeapon(dedupedWeapons);
    }, [weapons, isLoadingWeapons]);

    const currentLevel = useMemo(() => {
        if (!optimizationResult) return getStartingStats(startingClass).level;
        return calculateLevel(optimizationResult.optimizedAttributes);
    }, [optimizationResult, startingClass]);

    return (
        <Box sx={{ display: 'grid', gap: 3 }}>
            <Typography variant="h5" gutterBottom>Stat Optimizer</Typography>

            <Card variant="outlined">
                <CardContent>
                    <Typography variant="h6" gutterBottom>Configuration</Typography>
                    <Grid container spacing={2}>
                        {/* Row 1: Class, Level, Weapon */}
                        <Grid item xs={12} sm={4}>
                            <FormControl fullWidth size="small">
                                <InputLabel id="starting-class-label">Starting Class</InputLabel>
                                <Select
                                    labelId="starting-class-label"
                                    label="Starting Class"
                                    value={startingClass}
                                    onChange={handleStartingClassChange}
                                >
                                    {Object.values(StartingClass).map(cls => (
                                        <MenuItem key={cls} value={cls}>{cls}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <NumberTextField
                                label="Target Level"
                                value={targetLevel}
                                onChange={handleTargetLevelChange}
                                min={1}
                                max={713} // Max possible level
                                size="small"
                                fullWidth
                            />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <WeaponPicker
                                multiple={true}
                                selectedWeapons={selectedWeaponOptions}
                                onSelectedWeaponsChanged={handleWeaponChange}
                                weaponOptions={weaponPickerOptions}
                                loading={isLoadingWeapons}
                                label="Weapons"
                                size="small"
                            />
                        </Grid>

                        {/* Row 2: Upgrade Level (Conditional) */}
                        {selectedWeaponDetails && (
                            <Grid item xs={12} sm={4}>
                                <FormControl fullWidth size="small">
                                    <InputLabel id="upgrade-level-label">Upgrade Level</InputLabel>
                                    <Select
                                        labelId="upgrade-level-label"
                                        label="Upgrade Level"
                                        value={Math.min(upgradeLevel, maxUpgradeLevelForSelected)} // Ensure value doesn't exceed max
                                        onChange={handleUpgradeLevelChange}
                                    >
                                        {Array.from({ length: maxUpgradeLevelForSelected + 1 }, (_, i) => (
                                            <MenuItem key={i} value={i}>
                                                {maxUpgradeLevelForSelected === maxRegularUpgradeLevel
                                                    ? `+${i} / +${toSpecialUpgradeLevel(i)}`
                                                    : `+${i}`}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}

                        {/* Conditionally display Weapon Weights section */}
                        {selectedWeaponOptions.length > 1 && (
                            <Grid item xs={12} sx={{ pt: '8px !important' }}> {/* Adjust top padding */}
                                <Typography variant="caption" display="block" gutterBottom>
                                    Weapon Weights (higher prioritizes that weapon&apos;s score)
                                </Typography>
                                <Grid container spacing={1}>
                                    {selectedWeaponOptions.map(option => (
                                        <Grid item xs={6} sm={4} md={3} key={`weight-${option.value}`}>
                                            <NumberTextField
                                                label={option.label}
                                                value={weaponWeights[option.value] ?? 1}
                                                onChange={val => handleWeaponWeightChange(option.value, val)}
                                                size="small"
                                                min={0}
                                                step={0.1}
                                                fullWidth
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            </Grid>
                        )}
                    </Grid>
                </CardContent>
            </Card>

            <Accordion defaultExpanded>
                <AccordionSummary>
                    <Typography>Objective Weights</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography variant="overline" display="block" gutterBottom sx={{ width: '100%' }}>
                        Attack Rating
                    </Typography>
                    <Grid container spacing={2}>
                        {allDamageTypes.map(type => (
                            <Grid item xs={6} sm={4} md={2} key={`weight-ap-${type}`}>
                                <NumberTextField
                                    label={damageTypeLabels.get(type)?.replace(" Attack", "") ?? `${type} AR`}
                                    value={objectiveWeights.attackPower[type] ?? 0}
                                    onChange={(val) => handleWeightChange('attackPower', type, val)}
                                    min={0}
                                    step={0.1}
                                    size="small"
                                    fullWidth
                                />
                            </Grid>
                        ))}
                    </Grid>
                    <Typography variant="overline" display="block" gutterBottom sx={{ width: '100%', mt: 2 }}>
                        Status Buildup
                    </Typography>
                    <Grid container spacing={2}>
                        {allStatusTypes.map(type => (
                            <Grid item xs={6} sm={4} md={2} key={`weight-status-${type}`}>
                                <NumberTextField
                                    label={damageTypeLabels.get(type)?.replace(" Buildup", "") ?? `${type} Buildup`}
                                    value={objectiveWeights.statusEffect[type] ?? 0}
                                    onChange={(val) => handleWeightChange('statusEffect', type, val)}
                                    min={0}
                                    step={1}
                                    size="small"
                                    fullWidth
                                />
                            </Grid>
                        ))}
                    </Grid>
                    <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                        Note: Specific spell scaling type weights are currently unavailable.
                    </Typography>
                </AccordionDetails>
            </Accordion>

            <Accordion defaultExpanded>
                <AccordionSummary>
                    <Typography>Minimum Attributes (Optional)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <Grid container spacing={2}>
                        {allAttributes.map(attr => (
                            <Grid item xs={6} sm={4} md={3} lg={1} key={`min-${attr}`}>
                                <NumberTextField
                                    label={`${getAttributeLabel(attr)} Min`}
                                    value={minimumAttributes[attr] ?? 0}
                                    onChange={(val) => {
                                        handleMinimumChange(attr, isNaN(val) ? NaN : Number(val));
                                    }}
                                    min={0}
                                    max={99}
                                    step={1}
                                    size="small"
                                    fullWidth
                                    placeholder="None"
                                />
                            </Grid>
                        ))}
                    </Grid>
                </AccordionDetails>
            </Accordion>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button
                    variant="contained"
                    onClick={handleOptimizeClick}
                    disabled={isOptimizing || !selectedWeaponDetails}
                    startIcon={isOptimizing ? <CircularProgress size={20} color="inherit" /> : null}
                >
                    {isOptimizing ? 'Optimizing...' : 'Optimize Stats'}
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
            )}

            {optimizationResult && (
                <Paper elevation={2} sx={{ mt: 3, p: 2 }}>
                    <Typography variant="h6" gutterBottom>Optimization Result</Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle1">Optimized Attributes (Level {currentLevel})</Typography>
                            <Grid container spacing={1} sx={{ mt: 1 }}>
                                {allAttributes.map(attr => {
                                    const baseValue = optimizationResult.startingAttributes[attr];
                                    const optimizedValue = optimizationResult.optimizedAttributes[attr];
                                    const difference = optimizedValue - baseValue;
                                    return (
                                        <Grid item xs={3} sm={2} key={attr}>
                                            <Chip
                                                label={`${getAttributeLabel(attr)}: ${optimizedValue}`}
                                                title={`${baseValue} ${difference >= 0 ? '+' : ''}${difference}`}
                                                color={difference > 0 ? "primary" : "default"}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </Grid>
                                    );
                                })}
                            </Grid>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle1" gutterBottom>Calculated Performance</Typography>
                            {/* TODO: Display Attack Power, Status, Scaling clearly */}
                            <Typography variant="body2" gutterBottom>Score: {optimizationResult.finalScore.toFixed(2)}</Typography>
                            <Box sx={{ mt: 1 }}> {/* Use Box for structured display */}
                                <Typography variant="body2" component="div"><b>Attack Power:</b></Typography>
                                <Box sx={{ pl: 2 }}>
                                    {Object.entries(optimizationResult.attackResult.attackPower)
                                        .filter(([, value]) => value > 0) // Only show non-zero values
                                        .map(([key, value]) => (
                                            <Typography key={key} variant="body2">
                                                {damageTypeLabels.get(Number(key) as AttackPowerType) ?? `Type ${key}`}: {value.toFixed(1)}
                                            </Typography>
                                        ))}
                                    {Object.keys(optimizationResult.attackResult.attackPower).length === 0 && <Typography variant="body2">N/A</Typography>}
                                </Box>

                                {Object.keys(optimizationResult.attackResult.spellScaling).length > 0 && (
                                    <>
                                        <Typography variant="body2" component="div" sx={{ mt: 1 }}><b>Spell Scaling:</b></Typography>
                                        <Box sx={{ pl: 2 }}>
                                            {Object.entries(optimizationResult.attackResult.spellScaling).map(([key, value]) => (
                                                <Typography key={key} variant="body2">
                                                    {damageTypeLabels.get(Number(key) as AttackPowerType) ?? `Type ${key}`}: {value.toFixed(1)}
                                                </Typography>
                                            ))}
                                        </Box>
                                    </>
                                )}

                                {optimizationResult.attackResult.ineffectiveAttributes.length > 0 && (
                                    <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                                        Ineffective: {optimizationResult.attackResult.ineffectiveAttributes.map(getAttributeLabel).join(', ')}
                                    </Typography>
                                )}
                                {optimizationResult.attackResult.ineffectiveAttackPowerTypes.length > 0 && (
                                    <Typography variant="caption" display="block" color="text.secondary">
                                        Penalized: {optimizationResult.attackResult.ineffectiveAttackPowerTypes.map(t => damageTypeLabels.get(t as AttackPowerType) ?? `Type ${t}`).join(', ')}
                                    </Typography>
                                )}
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            )}
        </Box>
    );
} 