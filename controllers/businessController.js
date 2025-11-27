const express = require('express');
const { authenticateToken } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const databaseService = require('../services/databaseService');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Get business details of a particular user
router.get('/business/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Call database service method
    const business = await databaseService.db.GetBusinessByUserId({ UserId: userId });

    if (business) {
      return res.status(200).json({
        success: true,
        message: 'Business details retrieved successfully',
        data: business
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'No business information found for this user'
      });
    }

  } catch (error) {
    console.error('❌ Error getting business details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get business details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get all businesses (for admin/listing)
router.get('/businesses', authenticateToken, async (req, res) => {
  try {
    // Call database service method
    const businesses = await databaseService.db.GetAllBusinesses();

    return res.status(200).json({
      success: true,
      message: 'All businesses retrieved successfully',
      count: businesses.length,
      data: businesses
    });

  } catch (error) {
    console.error('❌ Error getting all businesses:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get businesses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Create/Update business information
router.post('/business', authenticateToken, async (req, res) => {
  try {
    const {
      userId,
      businessName,
      businessEmail,
      businessPhone,
      gstNumber,
      panNumber,
      address,
      city,
      state,
      country,
      zipCode,
      businessType
    } = req.body;

    // Check if business already exists
    const existingBusiness = await databaseService.db.CheckBusinessExists({ UserId: userId });

    if (existingBusiness) {
      // Update existing business
      await databaseService.db.UpdateBusinessInformation({
        UserId: userId,
        BusinessName: businessName,
        BusinessEmail: businessEmail,
        BusinessPhone: businessPhone,
        GSTNumber: gstNumber || '',
        PanNumber: panNumber || '',
        Address: address || '',
        City: city || '',
        State: state || '',
        Country: country || '',
        ZipCode: zipCode || '',
        BusinessType: businessType || ''
      });

      return res.status(200).json({
        success: true,
        message: 'Business information updated successfully'
      });

    } else {
      // Insert new business
      await databaseService.db.InsertBusinessInformation({
        userId: userId,
        businessName: businessName,
        email: businessEmail,
        mobileNumber: businessPhone
      });

      return res.status(201).json({
        success: true,
        message: 'Business information created successfully'
      });
    }

  } catch (error) {
    console.error('❌ Error saving business information:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save business information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update business information by business ID
router.put('/business/:businessId', authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    const {
      ownerName,
      businessName,
      email,
      mobileNumber,
      alternateNumber,
      shopAddress,
      googleMapLink,
      gpsLatitude,
      gpsLongitude,
      workingCity,
      serviceTypes,
      specialization,
      yearsOfExperience,
      portfolioPhotos,
      certifications,
      openingTime,
      closingTime,
      weeklyOff,
      businessLogo,
      businessDescription
    } = req.body;

    console.log('📋 Update business request - businessId:', businessId);
    console.log('📋 businessLogo length:', businessLogo ? businessLogo.length : 0);
    console.log('📋 portfolioPhotos length:', portfolioPhotos ? portfolioPhotos.length : 0);

    // Build update object - only include fields that are provided
    // This matches the signup API behavior which accepts base64 data
    const updateData = { businessId: businessId };
    
    if (ownerName !== undefined) updateData.ownerName = ownerName;
    if (businessName !== undefined) updateData.businessName = businessName;
    if (email !== undefined) updateData.email = email;
    if (mobileNumber !== undefined) updateData.mobileNumber = mobileNumber;
    if (alternateNumber !== undefined) updateData.alternateNumber = alternateNumber;
    if (shopAddress !== undefined) updateData.shopAddress = shopAddress;
    if (googleMapLink !== undefined) updateData.googleMapLink = googleMapLink;
    if (gpsLatitude !== undefined) updateData.gpsLatitude = gpsLatitude;
    if (gpsLongitude !== undefined) updateData.gpsLongitude = gpsLongitude;
    if (workingCity !== undefined) updateData.workingCity = workingCity;
    if (serviceTypes !== undefined) updateData.serviceTypes = serviceTypes;
    if (specialization !== undefined) updateData.specialization = specialization;
    if (yearsOfExperience !== undefined) updateData.yearsOfExperience = yearsOfExperience;
    if (portfolioPhotos !== undefined) updateData.portfolioPhotos = portfolioPhotos;
    if (certifications !== undefined) updateData.certifications = certifications;
    if (openingTime !== undefined) updateData.openingTime = openingTime;
    if (closingTime !== undefined) updateData.closingTime = closingTime;
    if (weeklyOff !== undefined) updateData.weeklyOff = weeklyOff;
    if (businessLogo !== undefined) updateData.businessLogo = businessLogo;
    if (businessDescription !== undefined) updateData.businessDescription = businessDescription;

    // Update business by business ID with only provided fields
    const result = await databaseService.db.UpdateBusinessByBusinessId(updateData);

    if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(200).json({
        success: true,
        message: 'Business information updated successfully'
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

  } catch (error) {
    console.error('❌ Error updating business information:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update business information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Upload business logo
router.post('/business/:businessId/upload-logo', authenticateToken, upload.single('logo'), async (req, res) => {
  try {
    const { businessId } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please upload an image file.'
      });
    }

    // Create business directory if it doesn't exist
    const businessDir = path.join(__dirname, '..', 'uploads', 'business');
    if (!fs.existsSync(businessDir)) {
      fs.mkdirSync(businessDir, { recursive: true });
    }

    // Move file to business directory
    const oldPath = req.file.path;
    const newPath = path.join(businessDir, req.file.filename);
    fs.renameSync(oldPath, newPath);

    // Generate URL path for the uploaded file
    const logoUrl = `/uploads/business/${req.file.filename}`;

    // Update business with logo path only
    await databaseService.db.UpdateBusinessLogo({
      businessId: businessId,
      businessLogo: logoUrl
    });

    return res.status(200).json({
      success: true,
      message: 'Business logo uploaded successfully',
      data: {
        logoUrl: logoUrl,
        filename: req.file.filename
      }
    });

  } catch (error) {
    console.error('❌ Error uploading business logo:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload business logo',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete business information
router.delete('/business/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;

    // Call database service method for soft delete
    const result = await databaseService.db.DeleteBusinessInformation({ UserId: userId });

    if (result && result.rowsAffected && result.rowsAffected[0] > 0) {
      return res.status(200).json({
        success: true,
        message: 'Business information deleted successfully'
      });
    } else {
      return res.status(404).json({
        success: false,
        message: 'Business information not found'
      });
    }

  } catch (error) {
    console.error('❌ Error deleting business information:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete business information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
