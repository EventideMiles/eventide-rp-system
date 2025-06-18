# Features System

The Features system in Eventide RP provides a powerful way to represent permanent character traits, background abilities, and circumstantial bonuses. Features can provide both passive bonuses and active roll capabilities, making them essential for character customization and storytelling.

## Overview

Features represent inherent character traits that define who your character is and what they can do. Unlike temporary status effects or equipment bonuses, features are permanent aspects of your character that reflect their background, training, species traits, or character development.

### Key Characteristics

- **Permanent Effects**: Features provide lasting modifications to your character
- **Rich Descriptions**: Support HTML formatting for detailed storytelling
- **Roll Integration**: Features can include their own roll mechanics
- **Visual Representation**: Optional token icons for easy identification
- **Flexible Bonuses**: Support for ability modifications, dice adjustments, and special mechanics

## Feature Types

### Passive Features

Passive features provide constant bonuses without requiring activation:

#### **Ability Modifiers**
- **Direct Bonuses**: Add flat values to ability scores
- **Conditional Bonuses**: Apply only under specific circumstances (IE: the feature is meant to be used under specific circumstances)

#### **Dice Pool Adjustments**
- **Advantage**: Add extra dice to rolls, keeping the highest
- **Disadvantage**: Add extra dice to rolls, keeping the lowest
- **Critical Range**: Modify when critical successes/failures occur (GM Only)

### Active Features (Roll-Enabled)

Active features include their own roll mechanics, allowing characters to make feature-specific rolls:

#### **Roll Types**

##### **Flat Bonus Rolls**
- **Fixed Modifier**: Roll 1d20 + fixed bonus
- **Simple Mechanics**: Straightforward bonus application
- **Reliable Results**: Consistent performance

##### **Ability-Based Rolls**
- **Ability Integration**: Use one of the five core abilities
- **Flat Bonuses**: Adds to the roll - used for situational features
- **Dynamic Bonuses**: Benefit from ability improvements
- **Modifier Stacking**: Combine with equipment and status effects

#### **Roll Configuration**

Features can be configured with detailed roll parameters:

- **Roll Type**: Choose between flat bonus, ability-based, or none
- **Ability Selection**: Pick which ability to use for ability-based rolls
- **Bonus Values**: Add flat modifiers to the roll
- **Dice Adjustments**: Configure advantage/disadvantage dice
- **Targeting**: Enable targeting for combat-relevant features

## Circumstantial Bonuses

One of the most powerful aspects of the Features system is the ability to create circumstantial bonuses that apply only under specific conditions.

### Concept

Circumstantial bonuses represent situational advantages that characters gain based on their background, training, or experience. These bonuses reflect the idea that characters excel in familiar environments or situations related to their expertise.

### Examples

#### **Background-Based Bonuses**

##### **City-Raised**
- **Description**: "You grew up in a bustling metropolis, learning to navigate crowds and urban environments."
- **Mechanical Effect**: +2 to Wits rolls when in urban environments
- **Storytelling Impact**: Reflects familiarity with city life and social dynamics

##### **Wilderness Survivor**
- **Description**: "Years in the wild have taught you to read nature's signs and survive harsh conditions."
- **Mechanical Effect**: +3 to Fortitude rolls when in natural environments
- **Storytelling Impact**: Emphasizes connection to nature and survival skills

##### **Noble Education**
- **Description**: "Your aristocratic upbringing included extensive education in history, politics, and etiquette."
- **Mechanical Effect**: +2 to Will rolls when dealing with nobility or formal situations
- **Storytelling Impact**: Highlights social advantages and cultural knowledge

#### **Professional Training**

##### **Military Veteran**
- **Description**: "Your service in organized military forces taught you discipline and tactical thinking."
- **Mechanical Effect**: +2 to Wits rolls during combat or tactical situations
- **Storytelling Impact**: Reflects strategic training and battlefield experience

##### **Merchant's Apprentice**
- **Description**: "Years of trading and negotiation have sharpened your ability to read people and situations."
- **Mechanical Effect**: +2 to Will rolls when negotiating or assessing value
- **Storytelling Impact**: Emphasizes commercial acumen and social skills

##### **Scholar's Training**
- **Description**: "Extensive study has given you deep knowledge and analytical thinking skills."
- **Mechanical Effect**: +3 to Wits rolls when researching or recalling information
- **Storytelling Impact**: Highlights intellectual pursuits and academic background

#### **Species or Cultural Traits**

##### **Dwarven Stonework**
- **Description**: "Your people have worked stone for generations, giving you an intuitive understanding of architecture."
- **Mechanical Effect**: +3 to Physical rolls when working with stone or in underground environments
- **Storytelling Impact**: Reflects cultural heritage and ancestral knowledge

##### **Elven Grace**
- **Description**: "Your natural agility and connection to nature manifest in fluid movement."
- **Mechanical Effect**: +2 to Acrobatics rolls in natural environments
- **Storytelling Impact**: Emphasizes natural grace and environmental harmony

### Implementation Guidelines

#### **For Game Masters**

##### **Creating Circumstantial Features**

1. **Identify the Circumstance**: Define when the bonus applies
2. **Choose Appropriate Ability**: Select the most relevant ability
3. **Set Reasonable Bonus**: Typically +1 to +3 for most situations
4. **Write Clear Description**: Explain both the background and mechanical effect
5. **Consider Frequency**: Ensure the circumstance occurs regularly enough to be meaningful

##### **Balancing Considerations**

- **Frequency of Use**: More common circumstances should have smaller bonuses
- **Specificity**: More specific circumstances can have larger bonuses
- **Character Concept**: Bonuses should reinforce the character's identity
- **Campaign Setting**: Ensure bonuses fit the world and story

##### **Example Bonus Ranges**

- **+1**: Very common circumstances (urban environments in a city campaign)
- **+2**: Moderately common circumstances (social situations for a diplomat)
- **+3**: Specific but meaningful circumstances (academic research for a scholar)
- **+4 or higher**: Very rare or highly specialized circumstances

#### **For Players**

##### **Proposing Circumstantial Features**

1. **Connect to Background**: Tie the feature to your character's history
2. **Be Specific**: Define exactly when the bonus applies
3. **Stay Reasonable**: Suggest appropriate bonus values
4. **Enhance Roleplay**: Choose bonuses that encourage interesting character moments
5. **Collaborate**: Work with your GM to refine the feature

##### **Using Circumstantial Features**

- **Communicate**: Let your GM know when you think a circumstantial bonus applies
- **Roleplay**: Use these moments to highlight your character's background
- **Be Honest**: Don't try to apply bonuses inappropriately
- **Embrace Limitations**: Accept when circumstances don't favor your character

## Feature Creation

### Using the Feature Creator

The Feature Creator provides a comprehensive interface for designing custom features:

#### **Basic Information**
- **Name**: Clear, descriptive title for the feature
- **Description**: Rich text description with HTML formatting support
- **Icon**: Optional image for visual representation

#### **Roll Configuration**
- **Roll Type**: Choose between none, flat bonus, or ability-based
- **Target Ability**: Select which ability to use for rolls
- **Bonus Value**: Add flat modifiers to the roll result
- **Advantage/Disadvantage**: Configure extra dice for rolls

#### **Character Effects**
- **Ability Modifications**: Permanent changes to ability scores
- **Resource Adjustments**: Modifications to Resolve and Power
- **Special Effects**: Custom mechanical benefits

### Best Practices

#### **Naming Conventions**
- Use descriptive names that immediately convey the feature's purpose
- Include the source or type when helpful (e.g., "Dwarven Stonework", "Military Training")
- Avoid overly generic names like "Bonus" or "Advantage"

#### **Description Writing**
- Start with the character background or source of the ability (On by default)
- Explain the mechanical effect clearly
- Include any limitations or specific circumstances
- Use evocative language that enhances immersion

#### **Mechanical Balance**
- Keep bonuses reasonable for the campaign level
- Ensure features enhance rather than overshadow core abilities
- Consider how features interact with other character elements
- Test features in play and adjust as needed

## Integration with Other Systems

### Status Effects
- Features can work alongside temporary status effects
- Permanent features provide a baseline that status effects modify
- Some status effects might temporarily suppress feature bonuses

### Equipment
- Gear bonuses stack with feature bonuses unless specifically noted
- Some features might enhance equipment effectiveness
- Cursed items might interact negatively with certain features

### Combat Powers
- Features can enhance combat power effectiveness
- Some features might reduce power costs or improve targeting
- Background features often influence which powers a character learns

### Transformations
- Transformation effects can temporarily override feature bonuses
- Some features might influence transformation capabilities
- Permanent features typically remain active during transformations

## Advanced Feature Concepts

### Scaling Features
Features that grow stronger as characters develop:
- **Level-Based**: Bonuses increase with character advancement
- **Usage-Based**: Features improve through repeated use
- **Story-Based**: Features evolve based on character experiences

### Conditional Features
Features with complex activation requirements:
- **Time-Based**: Only active during certain times or seasons
- **Location-Based**: Stronger in specific environments or regions
- **Social-Based**: Enhanced when interacting with certain groups

### Linked Features
Features that work together or build upon each other:
- **Prerequisite Chains**: Advanced features requiring basic ones
- **Synergy Bonuses**: Multiple features providing combined benefits
- **Exclusive Options**: Features that prevent taking conflicting abilities

## Troubleshooting

### Common Issues

#### **Feature Not Applying**
- Check that the feature is properly configured
- Verify that circumstances match the feature description
- Ensure the character sheet has updated after changes

#### **Bonus Calculation Errors**
- Confirm the roll type is set correctly
- Check that ability selection matches the intended design
- Verify that dice adjustments are configured properly

#### **Performance Issues**
- Limit the number of complex features per character
- Use simple bonuses when possible
- Avoid overly complex conditional logic

### Getting Help

If you encounter issues with the Features system:
1. Check this documentation for guidance
2. Consult with your GM about intended behavior
3. Test features in a safe environment before important rolls
4. Report persistent bugs to the system developers

## Conclusion

The Features system provides a robust foundation for character customization and storytelling in the Eventide RP System. By combining permanent character traits with flexible roll mechanics and circumstantial bonuses, features enable rich character development that enhances both mechanical gameplay and narrative depth.

Whether you're creating a city-raised diplomat with social advantages, a wilderness survivor with environmental bonuses, or a scholar with research expertise, the Features system provides the tools to bring your character concept to life while maintaining game balance and encouraging meaningful roleplay opportunities.
