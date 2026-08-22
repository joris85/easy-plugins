/**
 * Toss the Pics — feature toggle
 *
 * Set enabled to false to turn off the waiting toy entirely.
 * You can also remove the toss-toy/ folder and its includes from index.php.
 */
window.TOSS_TOY_CONFIG = {
    enabled: true,
    /** Show toy when at least this many images are processing */
    minImages: 2,
    /** Also show for a single image if it is flagged as large */
    showForSingleLargeImage: true,
    /** Max bouncing cards (0 = show all images) */
    maxVisibleCards: 0,
    blocks: {
        /** Target falling pieces per minute (image pool cycles at repeatsPerImage each) */
        piecesPerMinute: 20,
        /** How many times each upload appears in one pool cycle */
        repeatsPerImage: 4
    },
    /** Hidden icon on the upload dropzone opens the secret Blocks game */
    easterEgg: {
        enabled: true
    }
};
